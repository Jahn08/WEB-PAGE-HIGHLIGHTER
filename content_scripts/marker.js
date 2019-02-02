void function() {
    const markerClass = 'marker';

    let activeNode;

    document.addEventListener('contextmenu', info => {
        try {            
            if (info && info.target)
            {
                let msg;

                if (info.target.classList.contains(markerClass)) 
                {
                    msg = MessageReceiver.setUnmarkMenuReady();
                    activeNode = info.target;
                }
                else 
                    msg = MessageReceiver.setMarkMenuReady();

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
                new RangeMarker(receiver.markColourClass).applyClassToSelectedNodes();
            }
            else if (receiver.shouldUnmark())
            {
                if (curNode)
                {
                    curNode.replaceWith(document.createTextNode(curNode.innerHTML));
                    curNode.remove();
                }
            }
            else if (receiver.shouldChangeColour())
            {
                if (curNode) 
                    curNode.classList.replace(curNode.classList.item(1), receiver.markColourClass);
            }
            else {
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
