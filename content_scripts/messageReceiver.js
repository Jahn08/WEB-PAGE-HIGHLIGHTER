class MessageReceiver {
    constructor (msg)
    {
        const msgEvent = new MessageEvent(msg);

        let markColourClass;
        this.getMarkColourClass = () => markColourClass;

        const setColourClass = (msg) => { 
            markColourClass = MessageReceiver.msgEvent.getMarkColourClass(msg);
            return markColourClass ? true: false;
        };
        this.shouldMark = () => MessageReceiver.msgEvent.isMarkEvent(msg) && setColourClass(msg);

        this.shouldChangeColour = () => MessageReceiver.msgEvent.isChangeColourEvent(msg) && setColourClass(msg);

        this.shouldUnmark = () => MessageReceiver.msgEvent.isUnmarkEvent(msg);
    }

    static setMarkMenuReady() { return MessageReceiver.msgEvent.createMarkReadyEvent(); }

    static setUnmarkMenuReady() { return MessageReceiver.msgEvent.createUnmarkReadyEvent(); }
}

MessageReceiver.msgEvent = new MessageEvent(); 