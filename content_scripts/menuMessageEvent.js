class MenuMessageEvent {
    constructor () {
        this._markEvent = 'mark';
        this._markReadyEvent = 'setMarkReady';
        this._changeColourEvent = 'changeColour';

        this._unmarkReadyEvent = 'setUnmarkReady';
        this._unmarkEvent = 'unmark';

        this._saveReadyEvent = 'setSaveReady';
        this._saveEvent = 'save';

        this._colourClassField = 'colourClass';
    }

    createMarkEvent(colourClass) { return this._createEventWithColour(this._markEvent, [colourClass]); }

    _createEventWithColour(eventName, colourClasses) {
        const event = this._createEvent(eventName);
        event[this._colourClassField] = colourClasses;

        return event; 
    };

    _createEvent(eventName) { return { event: [eventName] }; }

    combineEvents(msgs = [])
    {
        if (!msgs.length)
            return null;

        return msgs.reduce((p, c) => {
            c.event.push(...p.event);

            if (!c.colourClass)
                c.colourClass = p.colourClass;
            else
                c.colourClass.push(...p.colourClass);
            
            return c;
        });
    }

    isMarkEvent(msg) { return this._isEvent(msg, this._markEvent); }

    _isEvent(msg, eventName) { return msg && msg.event.includes(eventName); }

    getMarkColourClasses(msg) { return msg ? msg[this._colourClassField]: []; }

    createMarkReadyEvent(curColourClasses) {
        return this._createEventWithColour(this._markReadyEvent, curColourClasses);
    }
    isSetMarkReadyEvent(msg) { return this._isEvent(msg, this._markReadyEvent); }

    createChangeColourEvent(colourClass) { return this._createEventWithColour(this._changeColourEvent, [colourClass]); }   
    isChangeColourEvent(msg) { return this._isEvent(msg, this._changeColourEvent); }

    createUnmarkReadyEvent() { return this._createEvent(this._unmarkReadyEvent); }
    isSetUnmarkReadyEvent(msg) { return this._isEvent(msg, this._unmarkReadyEvent); }

    createUnmarkEvent() { return this._createEvent(this._unmarkEvent); }
    isUnmarkEvent(msg) { return this._isEvent(msg, this._unmarkEvent); }

    createSaveReadyEvent() { return this._createEvent(this._saveReadyEvent); }
    isSetSaveReadyEvent(msg) { return this._isEvent(msg, this._saveReadyEvent); }

    createSaveEvent() { return this._createEvent(this._saveEvent); }
    isSaveEvent(msg) { return this._isEvent(msg, this._saveEvent); }   
}
