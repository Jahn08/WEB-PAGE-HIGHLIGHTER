const msgEvent = new MessageEvent();

export class MessageSender {
    constructor (msg) {
        this._msg = msg;
    }

    shouldSetMarkMenuReady() { return msgEvent.isSetMarkReadyEvent(this._msg); }

    shouldSetUnmarkMenuReady() { return msgEvent.isSetUnmarkReadyEvent(this._msg); }

    static startMarking(colourClass) { return msgEvent.createMarkEvent(colourClass); }

    static startChangingColour(colourClass) { return msgEvent.createChangeColourEvent(colourClass); }

    static startUnmarking() { return msgEvent.createUnmarkEvent(); }
}
