import { ContextMenu } from '../components/contextMenu.js';
import { MessageSender } from '../components/messageSender.js';

const menu = new ContextMenu();

menu.onMarking = (info) => browser.tabs.sendMessage(info.tabId, MessageSender.startMarking(info.colourClass));

menu.onChangingColour = (info) => browser.tabs.sendMessage(info.tabId, MessageSender.startChangingColour(info.colourClass));

menu.onUnmarking = (info) => browser.tabs.sendMessage(info.tabId, MessageSender.startUnmarking());

browser.runtime.onMessage.addListener(msg => new Promise((resolve, reject) => {
    try {
        const sender = new MessageSender(msg);
        
        if (sender.shouldSetMarkMenuReady() && (sender.currentColourClasses.length !== 1 || 
            sender.currentColourClasses[0] !== menu.currentColourClass))
            menu.showMarkingBtn();
        else
            menu.hideMarkingBtn();
        
        if (sender.shouldSetUnmarkMenuReady())
            menu.showUnmarkingBtn();
        else
            menu.hideUnmarkingBtn();
        
        menu.render();

        resolve();
    }
    catch (ex) {
        console.error('Error while trying to set menu visibility: ' + ex.toString());
        reject(ex);
    }
}));
