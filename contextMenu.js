import { ButtonMenuItem, SeparatorMenuItem } from './components/menuItem.js';
import { MessageSender } from './components/messageSender.js';

void function () {
    new SeparatorMenuItem().addToMenu();
    
    const markBtn = new ButtonMenuItem('mark', 'Mark selected text');
    const unmarkBtn = new ButtonMenuItem('unmark', 'Unmark selected text');

    const getCurrentTabId = async () => {
        const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });

        if (!activeTabs || !activeTabs.length)
            throw new Error('No active tab was obtained');

        return activeTabs[0].id;
    };

    markBtn.addToSelectionMenu(async () => { 
        try {
            const tabId = await getCurrentTabId();
            await browser.tabs.sendMessage(tabId, MessageSender.startMarking());
        }
        catch (ex) {
            console.error('Error while trying to mark: ' + ex.toString());
        }
    });

    unmarkBtn.addToMenu(async () => { 
        try {
            const tabId = await getCurrentTabId();
            await browser.tabs.sendMessage(tabId, MessageSender.startUnmarking());
        }
        catch (ex) {
            console.error('Error while trying to unmark: ' + ex.toString());
        }
    });

    unmarkBtn.hide();

    browser.runtime.onMessage.addListener(msg => new Promise((resolve, reject) => {
        try {
            const sender = new MessageSender(msg);
        
            if (sender.shouldSetMarkMenuReady())
            {
                unmarkBtn.hide();
                markBtn.show();
            }
            else if (sender.shouldSetUnmarkMenuReady())
            {
                markBtn.hide();
                unmarkBtn.show();
            }
    
            resolve();
        }
        catch (ex) {
            console.error('Error while trying to set menu visibility: ' + ex.toString());
            reject(ex);
        }
    }));
}();
