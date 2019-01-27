void function() {
    const markerClass = 'marker';

    let ctrlForUnmark;

    document.addEventListener('contextmenu', info => {
        try {
            if (info && info.target)
            {
                let msg;

                if (info.target.classList.contains(markerClass)) 
                {
                    msg = MessageReceiver.setUnmarkMenuReady();
                    ctrlForUnmark = info.target;
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

            if (receiver.shouldMark())
            {
                const spanEl = document.createElement('span');
                spanEl.classList.add(markerClass, 'greenMarker');
                
                const range = window.getSelection().getRangeAt(0);
                range.surroundContents(spanEl);
                range.collapse();

                resolve();
            }
            else if (receiver.shouldUnmark())
            {
                if (ctrlForUnmark)
                {
                    ctrlForUnmark.replaceWith(document.createTextNode(ctrlForUnmark.innerHTML));
                    ctrlForUnmark.remove();
                    ctrlForUnmark = null;
                }

                resolve();
            }
            else
                reject(new Error(`The message '${JSON.stringify(msg)}' has a wrong format and cannot be processed`));
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
