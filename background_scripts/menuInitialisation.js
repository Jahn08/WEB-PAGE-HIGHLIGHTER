import { ContextMenu } from '../components/contextMenu.js';
import { MessageSender } from '../components/messageSender.js';
import { Preferences } from '../components/preferences.js';

const menu = new ContextMenu();

const browserApi = new BrowserAPI();

const sendMessageToTab = (tabId, msgBody) => browserApi.tabs.sendMessage(tabId, msgBody).then(() =>
    browserApi.runtime.logLastError(`Error while sending a message ${JSON.stringify(msgBody)} to tab ${tabId}`));

menu.onMarking = (info) => sendMessageToTab(info.tabId,
    MessageSender.startMarking(info.colourClass));

menu.onChangingColour = (info) => sendMessageToTab(info.tabId, 
    MessageSender.startChangingColour(info.colourClass));

menu.onUnmarking = (info) => sendMessageToTab(info.tabId, MessageSender.startUnmarking());

menu.onSaving = info => {
    const msg = info.categoryTitle === undefined ? MessageSender.startSaving():
        MessageSender.startSavingToCategory(info.categoryTitle);
    sendMessageToTab(info.tabId, msg);
};

menu.onLoading = (info) => sendMessageToTab(info.tabId, MessageSender.startLoading());

menu.onAddingNote = (info) => 
    sendMessageToTab(info.tabId, MessageSender.startAddingNote())
        .then(outcome => {
            if (outcome)
                menu.appendNoteLink(outcome.id, outcome.text);
        });

menu.onRemovingNote = (info) =>
    sendMessageToTab(info.tabId, MessageSender.startRemovingNote())
        .then(noteId => menu.removeNoteLink(noteId));

menu.onGoingToNote = (info) => sendMessageToTab(info.tabId, 
    MessageSender.startGoingToNote(info.noteId));

browserApi.runtime.onMessage(async msg => {
    try {
        const sender = new MessageSender(msg);
    
        if (sender.shouldAddCategories())
            menu.renderPageCategories(sender.categories, sender.defaultCategory);

        if (sender.shouldLoadPreferences()) {
            const preferences = (await Preferences.loadFromStorage()) || {};
            menu.checkColourRadio(preferences.defaultColourToken);

            return preferences;
        }

        if (sender.shouldSetSaveMenuReady())
            menu.enableSaveBtn();
        else
            menu.disableSaveBtn();

        if (sender.shouldSetLoadMenuReady())
            menu.enableLoadBtn();
        else
            menu.disableLoadBtn();

        if (sender.shouldSetMarkMenuReady())
            menu.enableMarkingBtn();
        else
            menu.disableMarkingBtn();
        
        if (sender.shouldSetUnmarkMenuReady())
            menu.enableUnmarkingBtn();
        else
            menu.disableUnmarkingBtn();

        if (sender.shouldSetAddNoteMenuReady())
            menu.enableAddingNoteBtn();
        else
            menu.disableAddingNoteBtn();

        if (sender.shouldSetRemoveNoteMenuReady())
            menu.enableRemovingNoteBtn();
        else
            menu.disableRemovingNoteBtn();
        
        if (sender.shouldAddNoteLinks())
            menu.renderNoteLinks(sender.noteLinks);

        return true;
    }
    catch (ex) {
        console.error('Error while trying to set menu visibility: ' + ex.toString());
        throw ex;
    }
});
