class MessageEvent {
    constructor () {
        this._markEvent = 'mark';
        this._markReadyEvent = 'setMarkReady';
        this._changeColourEvent = 'changeColour';

        this._unmarkStateEvent = 'setUnmarkReady';
        this._unmarkEvent = 'unmark';

        this._colourClassField = 'colourClass';
    }

    createMarkEvent(colourClass) { return this._createEventWithColour(this._markEvent, colourClass); }

    _createEventWithColour(eventName, colourClass) {
        const event = this._createEvent(eventName);
        event[this._colourClassField] = colourClass;

        return event; 
    };

    _createEvent(eventName) { return { event: eventName }; }

    isMarkEvent(msg) { return this._isEvent(msg, this._markEvent); }

    _isEvent(msg, eventName) { return msg && msg.event === eventName; }

    getMarkColourClass(msg) { return msg ? msg[this._colourClassField]: ''; }

    createMarkReadyEvent() { return this._createEvent(this._markReadyEvent); }
    isSetMarkReadyEvent(msg) { return this._isEvent(msg, this._markReadyEvent); }

    createChangeColourEvent(colourClass) { return this._createEventWithColour(this._changeColourEvent, colourClass); }   
    isChangeColourEvent(msg) { return this._isEvent(msg, this._changeColourEvent); }

    createUnmarkReadyEvent() { return this._createEvent(this._unmarkStateEvent); }
    isSetUnmarkReadyEvent(msg) { return this._isEvent(msg, this._unmarkStateEvent); }

    createUnmarkEvent() { return this._createEvent(this._unmarkEvent); }
    isUnmarkEvent(msg) { return this._isEvent(msg, this._unmarkEvent); }    
}
