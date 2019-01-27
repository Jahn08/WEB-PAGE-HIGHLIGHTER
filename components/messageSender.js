const msgEvent = new MessageEvent();

export class MessageSender {
    constructor (msg)
    {
        this.shouldSetMarkMenuReady = () => msgEvent.isSetMarkReadyEvent(msg);

        this.shouldSetUnmarkMenuReady = () => msgEvent.isSetUnmarkReadyEvent(msg);
    }

    static startMarking() { return msgEvent.createMarkEvent(); }

    static startUnmarking() { return msgEvent.createUnmarkEvent(); }
}
