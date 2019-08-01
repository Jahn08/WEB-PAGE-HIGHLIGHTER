void function() {
    let activeNode;

    let domIsPure;
    let canLoad;

    const preferences = {};

    const BEFORE_UNLOAD_EVENT = 'beforeunload';

    const beforeUnloadEventListener = _event => {
        if (domIsPure === false)
            return _event.returnValue = 'You discard all unsaved changes on this page when leaving.';
    
        return;
    };

    window.addEventListener(BEFORE_UNLOAD_EVENT, beforeUnloadEventListener);

    const performStorageAction = async callback => {
        try {
            await callback();

            canLoad = await pageInfo.canLoad();

            domIsPure = true;
        }
        finally {
            MessageControl.hide();
        }
    };

    const pageInfo = new PageInfo();

    const save = async () => {
        try {
            await pageInfo.save();
            MessageControl.show('The page has been saved successfully');
        }
        catch (err) {
            alert(`An error occurred while trying to save the page: "${err.toString()}". ` +
                'Please, consider going to the preferences to remove redundant saved pages');
        }
    };

    const load = async () => {
        MessageControl.show('Page is loading');
        await pageInfo.load();

        MessageControl.show('The page has been loaded successfully');
    };

    const browserApi = new BrowserAPI();
    browserApi.runtime.sendMessage(MessageReceiver.loadPreferences()).then(async settings => {
        try {
            Object.assign(preferences, settings);

            if (preferences.shouldWarn === false)
                window.removeEventListener(BEFORE_UNLOAD_EVENT, beforeUnloadEventListener);

            canLoad = await pageInfo.canLoad();

            if (canLoad && (preferences.shouldLoad || pageInfo.shouldLoad()))
                await performStorageAction(load);
        }
        catch (ex) {
            console.error('An error occurred while trying to apply the extension preferences: ' + 
                ex.toString());
        }
    });    

    const includeLoadSaveEvents = (msg = null) => {
        if (domIsPure)
            return msg;

        if (domIsPure === false)
            msg = MessageReceiver.combineEvents(msg, 
                MessageReceiver.setSaveMenuReady());

        if (canLoad)
            msg = MessageReceiver.combineEvents(msg, 
                MessageReceiver.setLoadMenuReady());

        return msg;
    };

    document.addEventListener('mousedown', async _event => {
        try {
            if (_event.button !== 2)
                return true;

            let msg;
            const curColourClasses = RangeMarker.getColourClassesForSelectedNodes();

            const focusedNode = _event.target;

            if (curColourClasses)
            {
                msg = MessageReceiver.combineEvents(MessageReceiver.setMarkMenuReady(curColourClasses), 
                    MessageReceiver.setAddNoteMenuReady());

                if (curColourClasses.length)
                    msg = MessageReceiver.combineEvents(msg, MessageReceiver.setUnmarkMenuReady());
            }
            else if (RangeMarker.isNodeMarked(focusedNode)) 
            {
                msg = MessageReceiver.combineEvents(MessageReceiver.setUnmarkMenuReady(), 
                    MessageReceiver.setAddNoteMenuReady());
                activeNode = focusedNode;
            }
            
            if (RangeNote.hasNote(focusedNode)) {
                msg = MessageReceiver.combineEvents(msg, MessageReceiver.setRemoveNoteMenuReady());
                activeNode = focusedNode;
            }
            
            msg = MessageReceiver.combineEvents(msg, MessageReceiver.addNoteLinks(RangeNote.getNoteLinks()));
            await browserApi.runtime.sendMessage(includeLoadSaveEvents(msg));
        }
        catch (ex) {
            console.error('An error while trying to set menu visibility: ' + ex.toString());
        }
    });

    const processMessage = async msg => {
        try {
            const receiver = new MessageReceiver(msg);

            const curNode = activeNode;
            activeNode = null;

            let domWasChanged = false;

            let outcome;

            if (receiver.shouldMark())
                domWasChanged = RangeMarker.markSelectedNodes(receiver.markColourClass);
            else if (receiver.shouldUnmark()) {
                domWasChanged = RangeMarker.unmarkSelectedNodes(curNode);
                
                if (!RangeMarker.domContainsMarkers()) {
                    domWasChanged = false;
                    domIsPure = true;
                }
            }
            else if (receiver.shouldChangeColour())
                domWasChanged = RangeMarker.changeSelectedNodesColour(receiver.markColourClass, 
                    curNode);
            else if (receiver.shouldAddNote()) {
                outcome = RangeNote.createNote(prompt('New note text:'), curNode);

                if (outcome)
                    domWasChanged = true;
            }
            else if (receiver.shouldRemoveNote()) {
                outcome = RangeNote.removeNote(curNode);

                if (outcome)
                    domWasChanged = true;
            }
            else if (receiver.shouldSave())
                await performStorageAction(save);
            else if (receiver.shouldLoad())
                await performStorageAction(load);
            else if (receiver.shouldReturnTabState())
                return includeLoadSaveEvents();
            else if (receiver.shouldGoToNote())
                RangeNote.goToNote(receiver.noteLink.id);
            else
                throw new Error(`The message '${JSON.stringify(msg)}' has a wrong format and cannot be processed`);

            if (domWasChanged)
                domIsPure = false;

            return outcome;
        }
        catch (err) {
            console.error(err.toString());
            throw err;
        }
    };

    browserApi.runtime.onMessage(processMessage);
}();
