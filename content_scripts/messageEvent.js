class MessageEvent {
    constructor ()
    {
        const createEvent = (eventName) => { 
            return { event: eventName }; 
        };
        const isEvent = (msg, eventName) => msg && msg.event === eventName;

        const markEvent = 'mark';
        this.createMarkEvent = (colourClass) => { 
            const event = createEvent(markEvent);
            event.colourClass = colourClass;

            return event; 
        };
        this.isMarkEvent = (msg) => isEvent(msg, markEvent);

        const markReadyEvent = 'setMarkReady';
        this.createMarkReadyEvent = () => createEvent(markReadyEvent);
        this.isSetMarkReadyEvent = (msg) => isEvent(msg, markReadyEvent);

        const unmarkStateEvent = 'setUnmarkReady';
        this.createUnmarkReadyEvent = () => createEvent(unmarkStateEvent);
        this.isSetUnmarkReadyEvent = (msg) => isEvent(msg, unmarkStateEvent);

        const unmarkEvent = 'unmark';
        this.createUnmarkEvent = () => createEvent(unmarkEvent);
        this.isUnmarkEvent = (msg) => isEvent(msg, unmarkEvent);
    }
}
