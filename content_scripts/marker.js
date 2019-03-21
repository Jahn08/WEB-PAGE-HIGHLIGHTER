void function() {
    let activeNode;

    const rangeMarker = new RangeMarker();

    document.addEventListener('contextmenu', (info, isSelected) => {
        try {            
            if (info && info.target)
            {
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
        }
        catch (ex) {
            console.error('An error while trying to set menu visibility: ' + ex.toString());
        }
    });

    const processMessage = msg => {
        return new Promise((resolve, reject) => {
            const receiver = new MessageReceiver(msg);

            const curNode = activeNode;
            activeNode = null;

            if (receiver.shouldMark())
            {
                rangeMarker.markSelectedNodes(receiver.markColourClass);
            }
            else if (receiver.shouldUnmark())
            {
                rangeMarker.unmarkSelectedNodes(curNode);
            }
            else if (receiver.shouldChangeColour())
            {
                rangeMarker.changeSelectedNodesColour(receiver.markColourClass, curNode);
            }
            else 
            {
                reject(new Error(`The message '${JSON.stringify(msg)}' has a wrong format and cannot be processed`));
                return;
            }

            resolve();
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
