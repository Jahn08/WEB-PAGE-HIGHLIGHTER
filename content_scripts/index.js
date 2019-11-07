void function() {

    class Highlighter {
        constructor() {
            this._activeNode;

            this._domIsPure;
            this._canLoad;

            this._browserApi = new BrowserAPI();
            this._browserApi.runtime.onMessage(this._processMessage.bind(this));

            this._pageInfo = new PageInfo();
            this._initUnloadEvent();

            document.addEventListener('mousedown', this._setUpContextMenu.bind(this));
        }

        _initUnloadEvent() {
            const beforeUnloadEvent = 'beforeunload';

            const eventCallback = this._warnIfDomIsDirty.bind(this);
            window.addEventListener(beforeUnloadEvent, eventCallback);

            this._browserApi.runtime.sendMessage(MessageReceiver.loadPreferences())
                .then(async settings => {
                    try {
                        const preferences = Object.assign({}, settings);
            
                        if (preferences.shouldWarn === false)
                            window.removeEventListener(beforeUnloadEvent, eventCallback);
            
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

        _setUpContextMenu(event) {
            const errorPrefix = 'An error while trying to set menu visibility: ';

            try {
                if (event.button !== 2)
                    return true;
    
                let msg;
                const curColourClasses = RangeMarker.getColourClassesForSelectedNodes();
    
                const focusedNode = event.target;
    
                if (curColourClasses)
                {
                    msg = MessageReceiver.combineEvents(MessageReceiver.setMarkMenuReady(), 
                        MessageReceiver.setAddNoteMenuReady());
    
                    if (curColourClasses.length)
                        msg = MessageReceiver.combineEvents(msg, MessageReceiver.setUnmarkMenuReady());
                }
                else if (RangeMarker.isNodeMarked(focusedNode)) 
                {
                    msg = MessageReceiver.combineEvents(MessageReceiver.setUnmarkMenuReady(), 
                        MessageReceiver.setAddNoteMenuReady());
                    this._activeNode = focusedNode;
                }
                
                if (RangeNote.hasNote(focusedNode)) {
                    msg = MessageReceiver.combineEvents(msg, MessageReceiver.setRemoveNoteMenuReady());
                    this._activeNode = focusedNode;
                }
                
                msg = MessageReceiver.combineEvents(msg, MessageReceiver.addNoteLinks(RangeNote.getNoteLinks()));
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
                    return this._includeLoadSaveEvents();
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
            return this._processSaving(this._pageInfo.save.bind(this._pageInfo));
        }

        async _processSaving(savingFn, arg = null) {
            try {
                await savingFn(arg);
                MessageControl.show(this._browserApi.locale.getString('save-success-msg'));
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
