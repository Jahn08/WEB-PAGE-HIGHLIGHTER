const msgEvent = new MessageEvent();

export class MessageSender {
    constructor (msg) {
        this._msg = msg;
        this._curColourClasses = [];
    }

    shouldSetMarkMenuReady() { 
        const markingIsAvailable = msgEvent.isSetMarkReadyEvent(this._msg);
        
        if (markingIsAvailable)
            this._setColourClasses();

        return markingIsAvailable;
    }

    _setColourClasses() { this._curColourClasses = msgEvent.getMarkColourClasses(this._msg); }

    get currentColourClasses() { return this._curColourClasses; }

    shouldSetUnmarkMenuReady() { return msgEvent.isSetUnmarkReadyEvent(this._msg); }

    static startMarking(colourClass) { return msgEvent.createMarkEvent(colourClass); }

    static startChangingColour(colourClass) { return msgEvent.createChangeColourEvent(colourClass); }

    static startUnmarking() { return msgEvent.createUnmarkEvent(); }
}
