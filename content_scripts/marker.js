void function() {
    let activeNode;

    const rangeMarker = new RangeMarker();

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

    const saveOrLoad = async (isSaving) => {
        try {
            const pageInfo = new PageInfo();

            if (isSaving)
                await pageInfo.save();
            else {
                MessageControl.show('Page is loading');
                await pageInfo.load();
            }
    
            domIsPure = true;
            MessageControl.show(`The page has been ${isSaving ? 'saved' : 'loaded'} successfully`);
        }
        finally {
            MessageControl.hide();
        }
    };

    browser.runtime.sendMessage(MessageReceiver.loadPreferences()).then(async settings => {
        try {
            Object.assign(preferences, settings);

            if (preferences.shouldWarn === false)
                window.removeEventListener(BEFORE_UNLOAD_EVENT, beforeUnloadEventListener);

            const resp = await new PageInfo().canLoad();

            canLoad = resp;

            if (canLoad && preferences.shouldLoad)
                await saveOrLoad(false);
        }
        catch (ex) {
            console.error('An error while trying to apply the extension preferences: ' + ex.toString());
        }
    });    

    const includeLoadSaveEvents = (msg = null) => {
        if (domIsPure)
            return msg;

        if (domIsPure === false)
            msg = MessageReceiver.combineEvents(msg, MessageReceiver.setSaveMenuReady());

        if (canLoad)
            msg = MessageReceiver.combineEvents(msg, MessageReceiver.setLoadMenuReady());

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
                msg = MessageReceiver.setMarkMenuReady(curColourClasses);

                if (curColourClasses.length)
                    msg = MessageReceiver.combineEvents(msg, MessageReceiver.setUnmarkMenuReady());
            }
            else if (rangeMarker.isNodeMarked(info.target)) 
            {
                msg = MessageReceiver.setUnmarkMenuReady();
                activeNode = info.target;
            }
            
            browser.runtime.sendMessage(includeLoadSaveEvents(msg));
        }
        catch (ex) {
            console.error('An error while trying to set menu visibility: ' + ex.toString());
        }
    });

    const processMessage = msg => {
        return new Promise(async (resolve, reject) => {
            try {
                const receiver = new MessageReceiver(msg);

                const curNode = activeNode;
                activeNode = null;

                let isSaving;
                let domWasChanged = false;

                if (receiver.shouldMark())
                    domWasChanged = rangeMarker.markSelectedNodes(receiver.markColourClass);
                else if (receiver.shouldUnmark()) {
                    domWasChanged = rangeMarker.unmarkSelectedNodes(curNode);
                    
                    if (!RangeMarker.domContainsMarkers()) {
                        domWasChanged = false;
                        domIsPure = true;
                    }
                }
                else if (receiver.shouldChangeColour())
                    domWasChanged = rangeMarker.changeSelectedNodesColour(receiver.markColourClass, 
                        curNode);
                else if ((isSaving = receiver.shouldSave()) || receiver.shouldLoad())
                    saveOrLoad(isSaving);
                else if (receiver.shouldReturnTabState())
                    return resolve(includeLoadSaveEvents());
                else
                    throw new Error(`The message '${JSON.stringify(msg)}' has a wrong format and cannot be processed`);
    
                if (domWasChanged)
                    domIsPure = false;

                resolve();
            }
            catch (err) {
                console.log(err.toString());
                reject(err);
            }
        });
    };

    browser.runtime.onMessage.addListener(msg => new Promise(async (resolve, reject) => {
        try {
            const resp = await processMessage(msg);
            resolve(resp);
        }
        catch (ex) {
            reject(ex);
        }
    }));
}();
