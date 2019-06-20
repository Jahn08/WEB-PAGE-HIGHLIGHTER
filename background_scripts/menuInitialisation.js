import { ContextMenu } from '../components/contextMenu.js';
import { MessageSender } from '../components/messageSender.js';
import { Preferences } from '../components/preferences.js';

const menu = new ContextMenu();

const sendMessageToTab = (tabId, msgBody) => browser.tabs.sendMessage(tabId, msgBody);

menu.onMarking = (info) => sendMessageToTab(info.tabId,
    MessageSender.startMarking(info.colourClass));

menu.onChangingColour = (info) => sendMessageToTab(info.tabId, 
    MessageSender.startChangingColour(info.colourClass));

menu.onUnmarking = (info) => sendMessageToTab(info.tabId, MessageSender.startUnmarking());

menu.onSaving = (info) => sendMessageToTab(info.tabId, MessageSender.startSaving());

menu.onLoading = (info) => sendMessageToTab(info.tabId, MessageSender.startLoading());

browser.runtime.onMessage.addListener(msg => new Promise(async (resolve, reject) => {
    try {
        const sender = new MessageSender(msg);
    
        if (sender.shouldReturnPreferences()) {
            const preferences = await Preferences.loadFromStorage();

            if (preferences && preferences.defaultColourToken)
                menu.checkColourRadio(preferences.defaultColourToken);

            return resolve(preferences);
        }

        if (sender.shouldSetSaveMenuReady())
            menu.showSaveBtn();
        else
            menu.hideSaveBtn();

        if (sender.shouldSetLoadMenuReady())
            menu.showLoadBtn();
        else
            menu.hideLoadBtn();

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
