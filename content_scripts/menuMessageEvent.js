class MenuMessageEvent {
    constructor () {
        this._markEvent = 'mark';
        this._markReadyEvent = 'setMarkReady';
        this._changeColourEvent = 'changeColour';

        this._unmarkReadyEvent = 'setUnmarkReady';
        this._unmarkEvent = 'unmark';

        this._saveReadyEvent = 'setSaveReady';
        this._saveEvent = 'save';

        this._loadReadyEvent = 'setLoadReady';
        this._loadEvent = 'load';

        this._loadPreferencesEvent = 'loadPreferences';
        this._loadTabStateEvent = 'loadTabState';

        this._colourClassField = 'colourClass';

        this._addNoteReadyEvent = 'setAddNoteReady';
        this._addNoteEvent = 'addNote';

        this._removeNoteReadyEvent = 'setRemoveNoteReady';
        this._removeNoteEvent = 'removeNote';
    }

    createMarkEvent(colourClass) { return this._createEventWithColour(this._markEvent, [colourClass]); }

    _createEventWithColour(eventName, colourClasses) {
        const event = this._createEvent(eventName);
        event[this._colourClassField] = colourClasses;

        return event; 
    }

    _createEvent(eventName) { return { event: [eventName] }; }

    combineEvents(msgs = [])
    {
        msgs = msgs || [];

        const validMsgs = msgs.filter(m => m);

        if (!validMsgs.length)
            return null;

        if (validMsgs.length === 1)
            return validMsgs[0];

        return validMsgs.reduce((p, c) => {
            c.event.push(...p.event);

            if (!c.colourClass)
                c.colourClass = p.colourClass;
            else if (p.colourClass)
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

    createLoadReadyEvent() { return this._createEvent(this._loadReadyEvent); }
    isSetLoadReadyEvent(msg) { return this._isEvent(msg, this._loadReadyEvent); }

    createLoadEvent() { return this._createEvent(this._loadEvent); }
    isLoadEvent(msg) { return this._isEvent(msg, this._loadEvent); }

    createLoadPreferencesEvent() { return this._createEvent(this._loadPreferencesEvent); }
    isLoadPreferencesEvent(msg) { return this._isEvent(msg, this._loadPreferencesEvent); } 

    createLoadTabStateEvent() { return this._createEvent(this._loadTabStateEvent); }
    isLoadTabStateEvent(msg) { return this._isEvent(msg, this._loadTabStateEvent); }
    
    createAddNoteReadyEvent() { return this._createEvent(this._addNoteReadyEvent); }
    isSetAddNoteReadyEvent(msg) { return this._isEvent(msg, this._addNoteReadyEvent); }

    createAddNoteEvent() { return this._createEvent(this._addNoteEvent); }
    isAddNoteEvent(msg) { return this._isEvent(msg, this._addNoteEvent); }   

    createRemoveNoteReadyEvent() { return this._createEvent(this._removeNoteReadyEvent); }
    isSetRemoveNoteReadyEvent(msg) { return this._isEvent(msg, this._removeNoteReadyEvent); }

    createRemoveNoteEvent() { return this._createEvent(this._removeNoteEvent); }
    isRemoveNoteEvent(msg) { return this._isEvent(msg, this._removeNoteEvent); }
}
