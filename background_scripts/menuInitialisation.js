import { ContextMenu } from '../components/contextMenu.js';
import { SenderMessage } from '../components/senderMessage.js';
import { Preferences } from '../components/preferences.js';

const menu = new ContextMenu();

const browserApi = new BrowserAPI();

const sendMessageToTab = (tabId, msgBody) => browserApi.tabs.sendMessage(tabId, msgBody).then(() =>
    browserApi.runtime.logLastError(`Error while sending a message ${JSON.stringify(msgBody)} to tab ${tabId}`));

menu.onMarking = (info) => sendMessageToTab(info.tabId,
    SenderMessage.startMarking(info.colourClass));

menu.onChangingColour = (info) => sendMessageToTab(info.tabId, 
    SenderMessage.startChangingColour(info.colourClass));

menu.onUnmarking = (info) => sendMessageToTab(info.tabId, SenderMessage.startUnmarking());

menu.onSaving = info => {
    const msg = info.categoryTitle === undefined ? SenderMessage.startSaving():
        SenderMessage.startSavingToCategory(info.categoryTitle);
    sendMessageToTab(info.tabId, msg);
};

menu.onLoading = (info) => sendMessageToTab(info.tabId, SenderMessage.startLoading());

menu.onAddingNote = (info) => 
    sendMessageToTab(info.tabId, SenderMessage.startAddingNote())
        .then(outcome => {
            if (outcome)
                menu.appendNoteLink(outcome.id, outcome.text);
        });

menu.onRemovingNote = (info) =>
    sendMessageToTab(info.tabId, SenderMessage.startRemovingNote())
        .then(noteId => menu.removeNoteLink(noteId));

menu.onGoingToNote = (info) => sendMessageToTab(info.tabId, 
    SenderMessage.startGoingToNote(info.noteId));

browserApi.runtime.onMessage(async msg => {
    try {
        const senderMsg = new SenderMessage(msg);
    
        if (senderMsg.shouldAddCategories())
            menu.renderPageCategories(senderMsg.categories, senderMsg.defaultCategory);

        if (senderMsg.shouldLoadPreferences()) {
            const preferences = (await Preferences.loadFromStorage()) || {};
            menu.checkColourRadio(preferences.defaultColourToken);
            menu.renderShortcuts(preferences.shortcuts);

            return preferences;
        }

        if (senderMsg.shouldUpdateShortcuts())
            menu.renderShortcuts(senderMsg.shortcuts);

        if (senderMsg.shouldSetSaveMenuReady())
            menu.enableSaveBtn();
        else
            menu.disableSaveBtn();

        if (senderMsg.shouldSetLoadMenuReady())
            menu.enableLoadBtn();
        else
            menu.disableLoadBtn();

        if (senderMsg.shouldSetMarkMenuReady())
            menu.enableMarkingBtn();
        else
            menu.disableMarkingBtn();
        
        if (senderMsg.shouldSetUnmarkMenuReady())
            menu.enableUnmarkingBtn();
        else
            menu.disableUnmarkingBtn();

        if (senderMsg.shouldSetAddNoteMenuReady())
            menu.enableAddingNoteBtn();
        else
            menu.disableAddingNoteBtn();

        if (senderMsg.shouldSetRemoveNoteMenuReady())
            menu.enableRemovingNoteBtn();
        else
            menu.disableRemovingNoteBtn();
            
        if (senderMsg.shouldEmitEvent()) {
            menu.emitItemClick(senderMsg.eventName);
            return true;
        }

        if (senderMsg.shouldAddNoteLinks())
            menu.renderNoteLinks(senderMsg.noteLinks);

        return true;
    } catch (ex) {
        console.error('Error while trying to set menu visibility: ' + ex.toString());
        throw ex;
    }
});
