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
            menu.enableSaveBtn();
        else
            menu.disableSaveBtn();

        if (sender.shouldSetLoadMenuReady())
            menu.enableLoadBtn();
        else
            menu.disableLoadBtn();

        if (sender.shouldSetMarkMenuReady() && (sender.currentColourClasses.length !== 1 || 
            sender.currentColourClasses[0] !== menu.currentColourClass))
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

        menu.render();
    }
    catch (ex) {
        console.error('Error while trying to set menu visibility: ' + ex.toString());
        throw ex;
    }
});
