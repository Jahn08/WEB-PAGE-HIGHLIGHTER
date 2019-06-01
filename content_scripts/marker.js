void function() {
    let activeNode;

    const rangeMarker = new RangeMarker();

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

            browser.runtime.sendMessage(msg);
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

                if (receiver.shouldMark())
                    rangeMarker.markSelectedNodes(receiver.markColourClass);
                else if (receiver.shouldUnmark())
                    rangeMarker.unmarkSelectedNodes(curNode);
                else if (receiver.shouldChangeColour())
                    rangeMarker.changeSelectedNodesColour(receiver.markColourClass, curNode);
                else if ((isSaving = receiver.shouldSave()) || receiver.shouldLoad()) {
                    const pageInfo = new PageInfo();

                    if (isSaving)
                        await pageInfo.save();
                    else
                        await pageInfo.load();

                    alert(`The page has been ${isSaving ? 'saved' : 'loaded'} successfully`);
                }
                else
                    throw new Error(`The message '${JSON.stringify(msg)}' has a wrong format and cannot be processed`);
    
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
        catch (ex)
        {
            reject(ex);
        }
    }));
}();
