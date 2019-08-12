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
                return event.returnValue = 'You will discard all unsaved changes on this page when leaving.';
        }
    
        async _performStorageAction(callback) {
            try {
                await callback.bind(this)();
    
                this._canLoad = await this._pageInfo.canLoad();
    
                this._domIsPure = true;
            }
            finally {
                MessageControl.hide();
            }
        }

        async _load() {
            MessageControl.show('Page is loading');
            await this._pageInfo.load();
            
            MessageControl.show('The page has been loaded successfully');
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

                let outcome;
                
                if (receiver.shouldMark())
                    domWasChanged = RangeMarker.markSelectedNodes(receiver.markColourClass);
                else if (receiver.shouldUnmark() && RangeMarker.unmarkSelectedNodes(curNode))
                    isElementRemoval = true;
                else if (receiver.shouldChangeColour())
                    domWasChanged = RangeMarker.changeSelectedNodesColour(receiver.markColourClass, 
                        curNode);
                else if (receiver.shouldAddNote() && RangeNote.createNote(prompt('New note text:'), curNode))
                    domWasChanged = true;
                else if (receiver.shouldRemoveNote() && RangeNote.removeNote(curNode))
                    isElementRemoval = true;
                else if (receiver.shouldSave())
                    await this._performStorageAction(this._save);
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
    
                return outcome;
            }
            catch (err) {
                console.error(err.toString());
                throw err;
            }
        }

        _domHasOnlyOwnElements() {
            return !RangeMarker.domContainsMarkers() && !RangeNote.getNoteLinks().length;
        }

        async _save() {
            try {
                await this._pageInfo.save();
                MessageControl.show('The page has been saved successfully');
            }
            catch (err) {
                alert(`An error occurred while trying to save the page: "${err.toString()}". ` +
                    'Please, consider going to the preferences to remove redundant saved pages');
            }
        }
    }

    new Highlighter();
}();
