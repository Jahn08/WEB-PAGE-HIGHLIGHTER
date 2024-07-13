import { ContextMenu } from '../components/contextMenu.js';
import { SenderMessage } from '../components/senderMessage.js';
import { Preferences } from '../components/preferences.js';
import { MessageSender } from '../components/messageSender.js';

const menu = new ContextMenu();

menu.onMarking = MessageSender.sendMarking;

menu.onChangingColour = MessageSender.sendChangingColour;

menu.onUnmarking = MessageSender.sendUnmarking;

menu.onSaving = MessageSender.sendSaving;

menu.onLoading = MessageSender.sendLoading;

menu.onAddingNote = (info) => MessageSender.sendAddingNote(info, menu);

menu.onRemovingNote = (info) => MessageSender.sendRemovingNote(info, menu);

menu.onGoingToNote = MessageSender.sendGoingToNote;

new BrowserAPI().runtime.onMessage(async msg => {
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
