class MessageEvent {
    constructor ()
    {
        const createEvent = (eventName) => { 
            return { event: eventName }; 
        };
        const isEvent = (msg, eventName) => msg && msg.event === eventName;

        const markEvent = 'mark';
        const colourClassField = 'colourClass';
        
        const createEventWithColour = (eventName, colourClass) => {
            const event = createEvent(eventName);
            event[colourClassField] = colourClass;

            return event; 
        };

        this.createMarkEvent = (colourClass) => createEventWithColour(markEvent, colourClass); 
        this.isMarkEvent = (msg) => isEvent(msg, markEvent);
        this.getMarkColourClass = (msg) => msg ? msg[colourClassField]: '';

        const markReadyEvent = 'setMarkReady';
        this.createMarkReadyEvent = () => createEvent(markReadyEvent);
        this.isSetMarkReadyEvent = (msg) => isEvent(msg, markReadyEvent);

        const changeColourEvent = 'changeColour';
        this.createChangeColourEvent = (colourClass) =>  createEventWithColour(changeColourEvent, colourClass); 
        this.isChangeColourEvent = (msg) => isEvent(msg, changeColourEvent);

        const unmarkStateEvent = 'setUnmarkReady';
        this.createUnmarkReadyEvent = () => createEvent(unmarkStateEvent);
        this.isSetUnmarkReadyEvent = (msg) => isEvent(msg, unmarkStateEvent);

        const unmarkEvent = 'unmark';
        this.createUnmarkEvent = () => createEvent(unmarkEvent);
        this.isUnmarkEvent = (msg) => isEvent(msg, unmarkEvent);
    }
}
