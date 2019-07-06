void function() {
    let activeNode;

    const rangeMarker = new window.RangeMarker();

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
            window.MessageControl.hide();
        }
    };

    const pageInfo = new window.PageInfo();

    const save = async () => {
        await pageInfo.save();
        window.MessageControl.show('The page has been saved successfully');
    };

    const load = async () => {
        window.MessageControl.show('Page is loading');
        await pageInfo.load();

        window.MessageControl.show('The page has been loaded successfully');
    };

    browser.runtime.sendMessage(window.MessageReceiver.loadPreferences()).then(async settings => {
        try {
            Object.assign(preferences, settings);

            if (preferences.shouldWarn === false)
                window.removeEventListener(BEFORE_UNLOAD_EVENT, beforeUnloadEventListener);

            canLoad = await pageInfo.canLoad();

            if (canLoad && preferences.shouldLoad)
                await performStorageAction(load);
        }
        catch (ex) {
            console.error('An error while trying to apply the extension preferences: ' + ex.toString());
        }
    });    

    const includeLoadSaveEvents = (msg = null) => {
        if (domIsPure)
            return msg;

        if (domIsPure === false)
            msg = window.MessageReceiver.combineEvents(msg, 
                window.MessageReceiver.setSaveMenuReady());

        if (canLoad)
            msg = window.MessageReceiver.combineEvents(msg, 
                window.MessageReceiver.setLoadMenuReady());

        return msg;
    };

    document.addEventListener('mousedown', info => {
        try {
            if (info.button !== 2)
                return true;
        
            let msg;
            const curColourClasses = rangeMarker.getColourClassesForSelectedNodes();

            if (curColourClasses)
            {
                msg = window.MessageReceiver.setMarkMenuReady(curColourClasses);

                if (curColourClasses.length)
                    msg = window.MessageReceiver.combineEvents(msg, window.MessageReceiver.setUnmarkMenuReady());
            }
            else if (rangeMarker.isNodeMarked(info.target)) 
            {
                msg = window.MessageReceiver.setUnmarkMenuReady();
                activeNode = info.target;
            }
            
            browser.runtime.sendMessage(includeLoadSaveEvents(msg));
        }
        catch (ex) {
            console.error('An error while trying to set menu visibility: ' + ex.toString());
        }
    });

    const processMessage = async msg => {
        try {
            const receiver = new window.MessageReceiver(msg);

            const curNode = activeNode;
            activeNode = null;

            let domWasChanged = false;

            if (receiver.shouldMark())
                domWasChanged = rangeMarker.markSelectedNodes(receiver.markColourClass);
            else if (receiver.shouldUnmark()) {
                domWasChanged = rangeMarker.unmarkSelectedNodes(curNode);
                
                if (!window.RangeMarker.domContainsMarkers()) {
                    domWasChanged = false;
                    domIsPure = true;
                }
            }
            else if (receiver.shouldChangeColour())
                domWasChanged = rangeMarker.changeSelectedNodesColour(receiver.markColourClass, 
                    curNode);
            else if (receiver.shouldSave())
                await performStorageAction(save);
            else if (receiver.shouldLoad())
                await performStorageAction(load);
            else if (receiver.shouldReturnTabState())
                return includeLoadSaveEvents();
            else
                throw new Error(`The message '${JSON.stringify(msg)}' has a wrong format and cannot be processed`);

            if (domWasChanged)
                domIsPure = false;
        }
        catch (err) {
            console.error(err.toString());
            throw err;
        }
    };

    browser.runtime.onMessage.addListener(processMessage);
}();
