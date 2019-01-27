const msgEvent = new MessageEvent();

export class MessageSender {
    constructor (msg)
    {
        this.shouldSetMarkMenuReady = () => msgEvent.isSetMarkReadyEvent(msg);

        this.shouldSetUnmarkMenuReady = () => msgEvent.isSetUnmarkReadyEvent(msg);
    }

    static startMarking(colourClass) { return msgEvent.createMarkEvent(colourClass); }

    static startChangingColour(colourClass) { return msgEvent.createChangeColourEvent(colourClass); }

    static startUnmarking() { return msgEvent.createUnmarkEvent(); }
}
