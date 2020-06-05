void function() {

    class Highlighter {
        constructor() {
            this._activeNode;

            this._domIsPure;
            this._canLoad;

            this._browserApi = new BrowserAPI();
            this._browserApi.runtime.onMessage(this._processMessage.bind(this));

            this._pageInfo = new PageInfo();
            this._defaultCategoryTitle;
            this._initUnloadEvent();

            document.addEventListener('mousedown', this._setUpContextMenuOnClick.bind(this));
            this._tempFocusedNode;

            this._keyTempCombination = [];
            this._shortcuts = {};
            this._keyDownEventName = 'keydown';
        }

        _watchShortcuts(event) {
            if (event.type === this._keyDownEventName) {
                const unifiedKey = Shortcut.extractKeyInfo(event);
    
                if (unifiedKey)
                    this._keyTempCombination.push(unifiedKey);

                const shortcut = new Shortcut(this._keyTempCombination);
                const commandIds = shortcut.getCommandsInUse(this._shortcuts);

                if (commandIds.length) {
                    this._setUpContextMenu(this._tempFocusedNode, 
                        MessageReceiver.emitEvent(commandIds[0]));
    
                    this._keyTempCombination = [];
                    event.preventDefault();
                }
            }
            else
                this._keyTempCombination = [];
        }    

        async _initUnloadEvent() {
            const beforeUnloadEvent = 'beforeunload';

            const eventCallback = this._warnIfDomIsDirty.bind(this);
            window.addEventListener(beforeUnloadEvent, eventCallback);

            const categories = await PageInfo.getAllSavedCategories();
            const categoryView = new CategoryView(categories);

            this._defaultCategoryTitle = categoryView.defaultCategoryTitle;
            const msg = MessageReceiver.addCategories(categoryView.categoryTitles, 
                this._defaultCategoryTitle);

            this._browserApi.runtime.sendMessage(MessageReceiver.combineEvents(msg, 
                MessageReceiver.loadPreferences())).then(async settings => {
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

                    this._canLoad = await this._pageInfo.canLoad();
        
                    if (this._canLoad && (preferences.shouldLoad || this._pageInfo.shouldLoad()))
                        await this._performStorageAction(this._load);
                }
                catch (ex) {
                    console.error('An error occurred while trying to apply the extension preferences: ' + 
                        ex.toString());
                }
            }).catch(error => console.error('An error while trying to get preferences: ' + error.toString()));
        }

        _warnIfDomIsDirty(event) {
            if (this._domIsPure === false)
                return event.returnValue = this._browserApi.locale.getString('page-unload-warn');
        }
    
        async _performStorageAction(callback, arg) {
            try {
                await callback.bind(this, arg)();
    
                this._canLoad = await this._pageInfo.canLoad();
    
                this._domIsPure = true;
            }
            finally {
                MessageControl.hide();
            }
        }

        async _load() {
            try {
                MessageControl.show(this._browserApi.locale.getString('load-msg'));
                await this._pageInfo.load();
                
                MessageControl.show(this._browserApi.locale.getString('load-success-msg'));
            }
            catch (err) {
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
            const errorPrefix = 'An error while trying to set menu visibility: ';
            
            try {
                const curColourClasses = RangeMarker.getColourClassesForSelectedNodes();

                let hasRangeOrFocusedNode;
                if (curColourClasses) {
                    msg = MessageReceiver.combineEvents(msg, MessageReceiver.setMarkMenuReady());
                    hasRangeOrFocusedNode = true;
    
                    if (curColourClasses.length)
                        msg = MessageReceiver.combineEvents(msg, MessageReceiver.setUnmarkMenuReady());
                }
                else if (RangeMarker.isNodeMarked(focusedNode)) {
                    msg = MessageReceiver.combineEvents(msg, MessageReceiver.setUnmarkMenuReady());
                    this._activeNode = focusedNode;
                    hasRangeOrFocusedNode = true;
                }
                
                if (RangeNote.hasNote(focusedNode)) {
                    msg = MessageReceiver.combineEvents(msg, MessageReceiver.setRemoveNoteMenuReady());
                    this._activeNode = focusedNode;
                }
                else if (hasRangeOrFocusedNode)
                    msg = MessageReceiver.combineEvents(msg, MessageReceiver.setAddNoteMenuReady());

                msg = MessageReceiver.combineEvents(msg, MessageReceiver.updateShortcuts(this._shortcuts),
                    MessageReceiver.addNoteLinks(RangeNote.getNoteLinks()));
                this._browserApi.runtime.sendMessage(this._includeLoadSaveEvents(msg))
                    .catch(error => console.error(errorPrefix + error.toString()));
    
                this._sleep(10);
            }
            catch (ex) {
                console.error(errorPrefix + ex.toString());
            }
        }

        _includeLoadSaveEvents(msg = null) {
            if (this._domIsPure)
                return msg;
    
            if (this._domIsPure === false)
                msg = MessageReceiver.combineEvents(msg, 
                    MessageReceiver.setSaveMenuReady());
    
            if (this._canLoad)
                msg = MessageReceiver.combineEvents(msg, 
                    MessageReceiver.setLoadMenuReady());
    
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
                const receiver = new MessageReceiver(msg);
    
                const curNode = this._activeNode;
                this._activeNode = null;
    
                let domWasChanged = false;
                let isElementRemoval = false;

                let noteInfo;
                
                if (receiver.shouldMark())
                    domWasChanged = RangeMarker.markSelectedNodes(receiver.markColourClass);
                else if (receiver.shouldUnmark()) {
                    if (RangeMarker.unmarkSelectedNodes(curNode))
                        isElementRemoval = true;
                }
                else if (receiver.shouldChangeColour())
                    domWasChanged = RangeMarker.changeSelectedNodesColour(receiver.markColourClass, 
                        curNode);
                else if (receiver.shouldAddNote()) {
                    if ((noteInfo = RangeNote.createNote(
                        prompt(this._browserApi.locale.getString('note-add-prompt')), curNode)))
                        domWasChanged = true;
                }
                else if (receiver.shouldRemoveNote()) {
                    if ((noteInfo = RangeNote.removeNote(curNode)))
                        isElementRemoval = true;
                }
                else if (receiver.shouldSave())
                    await this._performStorageAction(this._save);
                else if (receiver.shouldSaveToCategory())
                    await this._performStorageAction(this._saveToCategory, receiver.category);
                else if (receiver.shouldLoad())
                    await this._performStorageAction(this._load);
                else if (receiver.shouldReturnTabState())
                    return this._includeLoadSaveEvents(MessageReceiver.updateShortcuts(this._shortcuts));
                else if (receiver.shouldGoToNote())
                    RangeNote.goToNote(receiver.noteLink.id);
                else
                    throw new Error(`The message '${JSON.stringify(msg)}' has a wrong format and cannot be processed`);
    
                if (isElementRemoval && this._domHasOnlyOwnElements())
                    this._domIsPure = this._canLoad ? undefined : true;
                else if (domWasChanged || isElementRemoval)
                    this._domIsPure = false;
    
                return noteInfo;
            }
            catch (err) {
                console.error(err.toString());
                throw err;
            }
        }

        _domHasOnlyOwnElements() {
            return !RangeMarker.domContainsMarkers() && !RangeNote.getNoteLinks().length;
        }

        _save() {
            return this._processSaving(this._pageInfo.save.bind(this._pageInfo),
                this._defaultCategoryTitle);
        }

        async _processSaving(savingFn, arg = null) {
            try {
                const category = await savingFn(arg);
                MessageControl.show(category ? 
                    this._browserApi.locale.getStringWithArgs(
                        'save-to-category-success-msg', category):
                    this._browserApi.locale.getString('save-success-msg'));
            }
            catch (err) {
                alert(this._browserApi.locale.getStringWithArgs('save-error', err.toString()));
            }
        }

        _saveToCategory(categoryTitle) {
            return this._processSaving(this._pageInfo.saveToCategory.bind(this._pageInfo), 
                categoryTitle);
        }
    }

    new Highlighter();
}();
