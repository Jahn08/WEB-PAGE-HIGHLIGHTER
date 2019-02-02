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
        this._markColourClass = MessageReceiver.msgEvent.getMarkColourClass(this._msg);
        return this._markColourClass ? true: false;
    }

    shouldChangeColour() { 
        return MessageReceiver.msgEvent.isChangeColourEvent(this._msg) && this._setColourClass(); 
    }

    shouldUnmark() { return MessageReceiver.msgEvent.isUnmarkEvent(this._msg); }

    static setMarkMenuReady() { return MessageReceiver.msgEvent.createMarkReadyEvent(); }

    static setUnmarkMenuReady() { return MessageReceiver.msgEvent.createUnmarkReadyEvent(); }
}

MessageReceiver.msgEvent = new MessageEvent();
