import { BrowserAPI } from './browserAPI.js';
import { Shortcut } from './shortcut.js';
import { MessageControl } from './messageControl.js';
import { RangeNote } from './rangeNote.js';
import { RangeMarker } from './rangeMarker.js';
import { ReceiverMessage } from './receiverMessage.js';
import { PageInfo, CategoryView } from './pageInfo.js';

export class Highlighter {
    constructor() {
        this._activeNode;

        this._domIsPure;
        this._canLoad;

        this._browserApi = new BrowserAPI();
        this._browserApi.runtime.onMessage(this._processMessage.bind(this));

        this._pageInfo = new PageInfo();

        document.addEventListener('mousedown', this._setUpContextMenuOnClick.bind(this));
        this._tempFocusedNode;

        this._keyTempCombination = [];
        this._shortcuts = {};
        this._keyDownEventName = 'keydown';

        this._curColourClass;
    }

    get domIsPure() { return this._domIsPure; }

    _watchShortcuts(event) {
        if (event.type === this._keyDownEventName) {
            const unifiedKey = Shortcut.extractKeyInfo(event);

            if (unifiedKey)
                this._keyTempCombination.push(unifiedKey);

            const shortcut = new Shortcut(this._keyTempCombination);
            const commandIds = shortcut.getCommandsInUse(this._shortcuts, true);

            if (commandIds.length) {
                this._setUpContextMenu(this._tempFocusedNode, ReceiverMessage.emitEvent(commandIds[0]));

                this._keyTempCombination = [];
                event.preventDefault();
            }
        } else
            this._keyTempCombination = [];
    }

    initPreferences() {
        const beforeUnloadEvent = 'beforeunload';

        const eventCallback = this._warnIfDomIsDirty.bind(this);
        window.addEventListener(beforeUnloadEvent, eventCallback);

        return this._browserApi.runtime.sendMessage(ReceiverMessage.combineEvents(ReceiverMessage.loadPreferences())).then(async settings => {
            try {
                const preferences = Object.assign({}, settings);

                if (preferences.shouldWarn === false)
                    window.removeEventListener(beforeUnloadEvent, eventCallback);
    
                if (preferences.shortcuts && Object.keys(preferences.shortcuts).length) {
                    this._shortcuts = preferences.shortcuts;
                    const callback = this._watchShortcuts.bind(this);

                    window.addEventListener(this._keyDownEventName, callback);
                    window.addEventListener('keyup', callback);
                }

                this._curColourClass = preferences.defaultColourToken;

                this._canLoad = await this._pageInfo.canLoad();
    
                if (this._canLoad && (preferences.shouldLoad || this._pageInfo.shouldLoad()))
                    await this._performStorageAction(this._load);
            } catch (ex) {
                console.error('An error occurred while applying the extension preferences: ' + ex.toString());
            }
        }).catch(error => console.error('An error while getting preferences: ' + error.toString()));
    }

    _warnIfDomIsDirty(event) {
        if (this.domIsPure === false)
            return event.returnValue = this._browserApi.locale.getString('page-unload-warn');
    }

    async _performStorageAction(callback, arg) {
        try {
            await callback.bind(this, arg)();

            this._canLoad = await this._pageInfo.canLoad();

            this._domIsPure = true;
        } finally {
            MessageControl.hide();
        }
    }

    async _load() {
        try {
            MessageControl.show(this._browserApi.locale.getString('load-msg'));
            await this._pageInfo.load();
            
            MessageControl.show(this._browserApi.locale.getString('load-success-msg'));
        } catch (err) {
            alert(this._browserApi.locale.getStringWithArgs('load-error', err.toString()));
        }
    }

    _setUpContextMenuOnClick(event) {
        this._tempFocusedNode = event.target;

        if (event.button !== 2)
            return true;

        this._setUpContextMenu(event.target);
    }

    _setUpContextMenu(focusedNode, msg = null) {
        const errorPrefix = 'An error while setting menu availability: ';
        
        try {
            this._markingIsEnabled = false;
            this._unmarkingIsEnabled = false;
            this._addingNoteIsEnabled = false;
            this._removingNoteIsEnabled = false;

            const curColourClasses = RangeMarker.getColourClassesForSelectedNodes();

            let hasRangeOrFocusedNode;
            if (curColourClasses) {
                msg = ReceiverMessage.combineEvents(msg, ReceiverMessage.setMarkMenuReady());
                this._markingIsEnabled = true;
                
                hasRangeOrFocusedNode = true;

                if (curColourClasses.length) {
                    msg = ReceiverMessage.combineEvents(msg, ReceiverMessage.setUnmarkMenuReady());
                    this._unmarkingIsEnabled = true;
                }
            } else if (RangeMarker.isNodeMarked(focusedNode)) {
                msg = ReceiverMessage.combineEvents(msg, ReceiverMessage.setMarkMenuReady());
                this._markingIsEnabled = true;

                msg = ReceiverMessage.combineEvents(msg, ReceiverMessage.setUnmarkMenuReady());
                this._unmarkingIsEnabled = true;

                this._activeNode = focusedNode;
                hasRangeOrFocusedNode = true;
            }
            
            if (RangeNote.hasNote(focusedNode)) {
                msg = ReceiverMessage.combineEvents(msg, ReceiverMessage.setRemoveNoteMenuReady());
                this._removingNoteIsEnabled = true;

                this._activeNode = focusedNode;
            } else if (hasRangeOrFocusedNode) {
                msg = ReceiverMessage.combineEvents(msg, ReceiverMessage.setAddNoteMenuReady());
                this._addingNoteIsEnabled = true;
            }

            msg = ReceiverMessage.combineEvents(msg, ReceiverMessage.updateShortcuts(this._shortcuts),
                ReceiverMessage.addNoteLinks(RangeNote.getNoteLinks()));
            this._browserApi.runtime.sendMessage(this._includeLoadSaveEvents(msg))
                .catch(error => console.error(errorPrefix + error.toString()));

            this._sleep(10);
        } catch (ex) {
            console.error(errorPrefix + ex.toString());
        }
    }

    _includeLoadSaveEvents(msg = null) {
        this._savingIsEnabled = false;
        this._loadingIsEnabled = false;

        if (this.domIsPure)
            return msg;

        if (this.domIsPure === false) {
            msg = ReceiverMessage.combineEvents(msg, ReceiverMessage.setSaveMenuReady());
            this._savingIsEnabled = true;
        }

        if (this._canLoad) {
            msg = ReceiverMessage.combineEvents(msg, ReceiverMessage.setLoadMenuReady());
            this._loadingIsEnabled = true;
        }

        return msg;
    }
       
    _sleep(milliseconds) {
        const start = new Date().getTime();
    
        for (let i = 0; i < 1e7; i++)
            if ((new Date().getTime() - start) > milliseconds)
                break;
    }

    async _processMessage(msg) {
        try {
            const receiver = new ReceiverMessage(msg);

            const curNode = this._activeNode;
            this._activeNode = null;

            let domWasChanged = false;
            let isElementRemoval = false;

            let noteInfo;
            
            if (receiver.shouldMark()) {
                if (this._markingIsEnabled)
                    domWasChanged = RangeMarker.markSelectedNodes(this._curColourClass, curNode);
            } else if (receiver.shouldUnmark()) {
                if (this._unmarkingIsEnabled && RangeMarker.unmarkSelectedNodes(curNode))
                    isElementRemoval = true;
            } else if (receiver.shouldChangeColour()) {
                this._curColourClass = receiver.markColourClass;
                domWasChanged = RangeMarker.markSelectedNodes(this._curColourClass, curNode);
            } else if (receiver.shouldAddNote()) {
                if (this._addingNoteIsEnabled && (noteInfo = RangeNote.createNote(
                    prompt(this._browserApi.locale.getString('note-add-prompt')), curNode)))
                    domWasChanged = true;
            } else if (receiver.shouldRemoveNote()) {
                if (this._removingNoteIsEnabled && (noteInfo = RangeNote.removeNote(curNode)))
                    isElementRemoval = true;
            } else if (receiver.shouldSave()) {
                if (this._savingIsEnabled)
                    await this._performStorageAction(this._save);
            } else if (receiver.shouldSaveToCategory()) {
                if (this._savingIsEnabled)
                    await this._performStorageAction(this._saveToCategory, receiver.category);
            } else if (receiver.shouldLoad()) {
                if (this._loadingIsEnabled)
                    await this._performStorageAction(this._load);
            } else if (receiver.shouldReturnTabState())
                return this._includeLoadSaveEvents(ReceiverMessage.updateShortcuts(this._shortcuts));
            else if (receiver.shouldGoToNote())
                RangeNote.goToNote(receiver.noteLink.id);
            else
                throw new Error(`The message '${JSON.stringify(msg)}' has a wrong format and cannot be processed`);

            if (isElementRemoval && this._domHasOnlyOwnElements())
                this._domIsPure = this._canLoad ? undefined : true;
            else if (domWasChanged || isElementRemoval)
                this._domIsPure = false;

            return noteInfo;
        } catch (err) {
            console.error(err.toString());
            throw err;
        }
    }

    _domHasOnlyOwnElements() {
        return !RangeMarker.domContainsMarkers() && !RangeNote.getNoteLinks().length;
    }

    _save() {
        return this._processSaving(this._pageInfo.save.bind(this._pageInfo), Highlighter._getDefaultCategoryTitle);
    }

    async _processSaving(savingFn, arg = null) {
        try {
            const category = await savingFn(arg);
            MessageControl.show(category ? 
                this._browserApi.locale.getStringWithArgs('save-to-category-success-msg', category):
                this._browserApi.locale.getString('save-success-msg'));
        } catch (err) {
            alert(this._browserApi.locale.getStringWithArgs('save-error', err.toString()));
        }
    }

    _saveToCategory(categoryTitle) {
        return this._processSaving(this._pageInfo.saveToCategory.bind(this._pageInfo), categoryTitle);
    }

    static async _getDefaultCategoryTitle() {
        const categories = await PageInfo.getAllSavedCategories();
        return new CategoryView(categories).defaultCategoryTitle;
    }
}
