import { BrowserAPI } from '../content_scripts/browserAPI.js';
import { SenderMessage } from './senderMessage.js';

export class MessageSender {
    static sendMarking(info) {
        return MessageSender._sendMessageToTab(info.tabId, SenderMessage.startMarking());
    }

    static sendChangingColour(info) {
        return MessageSender._sendMessageToTab(info.tabId, SenderMessage.startChangingColour(info.colourClass));
    }
    
    static sendUnmarking(info) {
        return MessageSender._sendMessageToTab(info.tabId, SenderMessage.startUnmarking());
    }

    static sendSaving(info) {
        const msg = info.categoryTitle == null ? SenderMessage.startSaving():
            SenderMessage.startSavingToCategory(info.categoryTitle);
        return MessageSender._sendMessageToTab(info.tabId, msg);
    }

    static sendLoading(info) {
        return MessageSender._sendMessageToTab(info.tabId, SenderMessage.startLoading());
    }

    static sendAddingNote(info, menu) {
        return MessageSender._sendMessageToTab(info.tabId, SenderMessage.startAddingNote())
            .then(outcome => {
                if (outcome)
                    menu.appendNoteLink(outcome.id, outcome.text);
            });
    }
       
    static sendRemovingNote(info, menu) {
        return MessageSender._sendMessageToTab(info.tabId, SenderMessage.startRemovingNote())
            .then(noteId => menu.removeNoteLink(noteId));
    }
        
    static sendGoingToNote(info) {
        return MessageSender._sendMessageToTab(info.tabId, SenderMessage.startGoingToNote(info.noteId));
    }
    
    static _sendMessageToTab(tabId, msgBody) {
        const browserApi = new BrowserAPI();
        return browserApi.tabs.sendMessage(tabId, msgBody).then(outcome => {
            browserApi.runtime.logLastError(`Error while sending a message ${JSON.stringify(msgBody)} to tab ${tabId}`);
            return outcome;
        });
    }
}
