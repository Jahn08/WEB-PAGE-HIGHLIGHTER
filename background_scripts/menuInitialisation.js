import { ContextMenu } from '../components/contextMenu.js';
import { MessageSender } from '../components/messageSender.js';

void function () {
    const menu = new ContextMenu();
    
    menu.onMarking = (info) => browser.tabs.sendMessage(info.tabId, MessageSender.startMarking(info.colourClass));

    menu.onUnmarking = (info) => browser.tabs.sendMessage(info.tabId, MessageSender.startUnmarking());

    browser.runtime.onMessage.addListener(msg => new Promise((resolve, reject) => {
        try {
            const sender = new MessageSender(msg);

            if (sender.shouldSetMarkMenuReady())
                menu.makeReadyForMarking();
            else if (sender.shouldSetUnmarkMenuReady())
                menu.makeReadyForUnmarking();
            
            resolve();
        }
        catch (ex) {
            console.error('Error while trying to set menu visibility: ' + ex.toString());
            reject(ex);
        }
    }));
}();
