class MessageReceiver {
    constructor (msg) {
        this._msg = msg;       
        this._markColourClass = null;
    }

    get markColourClass() { return this._markColourClass; }

    shouldMark() {
        return MessageReceiver.msgEvent.isMarkEvent(this._msg) && this._setColourClass();
    }

    _setColourClass() { 
        this._markColourClass = MessageReceiver.msgEvent.getMarkColourClasses(this._msg)[0];
        return this._markColourClass ? true: false;
    }

    shouldChangeColour() { 
        return MessageReceiver.msgEvent.isChangeColourEvent(this._msg) && this._setColourClass(); 
    }

    shouldUnmark() { return MessageReceiver.msgEvent.isUnmarkEvent(this._msg); }

    static setMarkMenuReady(curColourClasses = []) { 
        return MessageReceiver.msgEvent.createMarkReadyEvent(curColourClasses); 
    }

    static setUnmarkMenuReady() { return MessageReceiver.msgEvent.createUnmarkReadyEvent(); }

    static setSaveMenuReady() { return MessageReceiver.msgEvent.createSaveReadyEvent(); }

    shouldSave() { return MessageReceiver.msgEvent.isSaveEvent(this._msg); }

    static setLoadMenuReady() { return MessageReceiver.msgEvent.createLoadReadyEvent(); }

    shouldLoad() { return MessageReceiver.msgEvent.isLoadEvent(this._msg); }

    static combineEvents(...msgs) { return MessageReceiver.msgEvent.combineEvents(msgs); }

    static loadPreferences() { return MessageReceiver.msgEvent.createLoadPreferencesEvent(); }

    shouldReturnTabState() { return MessageReceiver.msgEvent.isLoadTabStateEvent(this._msg); }

    static setAddNoteMenuReady() { return MessageReceiver.msgEvent.createAddNoteReadyEvent(); }

    shouldAddNote() { return MessageReceiver.msgEvent.isAddNoteEvent(this._msg); }

    static setRemoveNoteMenuReady() { return MessageReceiver.msgEvent.createRemoveNoteReadyEvent(); }

    shouldRemoveNote() { return MessageReceiver.msgEvent.isRemoveNoteEvent(this._msg); }
}

MessageReceiver.msgEvent = new MenuMessageEvent();
