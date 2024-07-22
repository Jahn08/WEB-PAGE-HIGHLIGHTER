import { MenuMessageEvent } from './menuMessageEvent.js';

export class ReceiverMessage {
    constructor (msg) {
        this._msg = msg;       
        this._markColourClass = null;
        this._noteLink = null;
        this._category = null;
    }

    get markColourClass() { return this._markColourClass; }

    shouldMark() {
        return ReceiverMessage.msgEvent.isMarkEvent(this._msg);
    }

    shouldChangeColour() { 
        return ReceiverMessage.msgEvent.isChangeColourEvent(this._msg) && this._setColourClass(); 
    }

    _setColourClass() { 
        this._markColourClass = ReceiverMessage.msgEvent.getMarkColourClass(this._msg);
        return !!this._markColourClass;
    }

    shouldUnmark() { return ReceiverMessage.msgEvent.isUnmarkEvent(this._msg); }

    static setMarkMenuReady() { 
        return ReceiverMessage.msgEvent.createMarkReadyEvent(); 
    }

    static setUnmarkMenuReady() { return ReceiverMessage.msgEvent.createUnmarkReadyEvent(); }

    static setSaveMenuReady() { return ReceiverMessage.msgEvent.createSaveReadyEvent(); }

    shouldSave() { return ReceiverMessage.msgEvent.isSaveEvent(this._msg); }

    shouldSaveToCategory() {
        return ReceiverMessage.msgEvent.isSaveToCategoryEvent(this._msg) && this._setCategory();
    }

    _setCategory() { 
        this._category = ReceiverMessage.msgEvent.getCategories(this._msg)[0];
        return this._category !== undefined;
    }

    get category() { return this._category; }

    static setLoadMenuReady() { return ReceiverMessage.msgEvent.createLoadReadyEvent(); }

    shouldLoad() { return ReceiverMessage.msgEvent.isLoadEvent(this._msg); }

    static combineEvents(...msgs) { return ReceiverMessage.msgEvent.combineEvents(msgs); }

    static loadPreferences() { return ReceiverMessage.msgEvent.createLoadPreferencesEvent(); }

    shouldReturnTabState() { return ReceiverMessage.msgEvent.isLoadTabStateEvent(this._msg); }

    static setAddNoteMenuReady() { return ReceiverMessage.msgEvent.createAddNoteReadyEvent(); }

    shouldAddNote() { return ReceiverMessage.msgEvent.isAddNoteEvent(this._msg); }

    static setRemoveNoteMenuReady() { return ReceiverMessage.msgEvent.createRemoveNoteReadyEvent(); }

    shouldRemoveNote() { return ReceiverMessage.msgEvent.isRemoveNoteEvent(this._msg); }
    
    static addNoteLinks(noteLinks) { 
        return ReceiverMessage.msgEvent.createAddNoteLinksEvent(noteLinks); 
    }

    shouldGoToNote() {
        return ReceiverMessage.msgEvent.isGoToNoteEvent(this._msg) && this._setNoteLink();
    }

    _setNoteLink() { 
        this._noteLink = ReceiverMessage.msgEvent.getNoteLinks(this._msg)[0];
        return this._noteLink ? true: false;
    }

    get noteLink() { return this._noteLink; }

    static emitEvent(eventName) {
        return ReceiverMessage.msgEvent.createEmitEvent(eventName);
    }

    static updateShortcuts(shortcuts) {
        return shortcuts ? ReceiverMessage.msgEvent.createUpdateShortcutsEvent(shortcuts) : null;
    }
}

ReceiverMessage.msgEvent = new MenuMessageEvent();
