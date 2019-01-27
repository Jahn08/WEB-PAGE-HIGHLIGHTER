class MessageReceiver {
    constructor (msg)
    {
        this.shouldMark = () => MessageReceiver.msgEvent.isMarkEvent(msg);

        this.shouldUnmark = () => MessageReceiver.msgEvent.isUnmarkEvent(msg);
    }

    static setMarkMenuReady() { return MessageReceiver.msgEvent.createMarkReadyEvent(); }

    static setUnmarkMenuReady() { return MessageReceiver.msgEvent.createUnmarkReadyEvent(); }
}

MessageReceiver.msgEvent = new MessageEvent(); 