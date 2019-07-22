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

browser.runtime.onMessage.addListener(async msg => {
    try {
        const sender = new MessageSender(msg);
    
        if (sender.shouldReturnPreferences()) {
            const preferences = await Preferences.loadFromStorage();

            if (preferences && preferences.defaultColourToken)
                menu.checkColourRadio(preferences.defaultColourToken);

            return preferences;
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

        if (sender.shouldSetAddNoteMenuReady())
            menu.showAddingNoteBtn();
        else
            menu.hideAddingNoteBtn();

        if (sender.shouldSetRemoveNoteMenuReady())
            menu.showRemovingNoteBtn();
        else
            menu.hideRemovingNoteBtn();
        
        if (sender.shouldAddNoteLinks())
            menu.renderNoteLinks(sender.noteLinks);

        menu.render();
    }
    catch (ex) {
        console.error('Error while trying to set menu visibility: ' + ex.toString());
        throw ex;
    }
});
