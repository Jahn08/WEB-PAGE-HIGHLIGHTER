const msgEvent = new MenuMessageEvent();

export class MessageSender {
    constructor (msg) {
        this._msg = msg;

        this._curColourClasses = [];

        this._noteLinks = [];
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

    shouldSetSaveMenuReady() { return msgEvent.isSetSaveReadyEvent(this._msg); }

    static startSaving() { return msgEvent.createSaveEvent(); }

    shouldSetLoadMenuReady() { return msgEvent.isSetLoadReadyEvent(this._msg); }

    static startLoading() { return msgEvent.createLoadEvent(); }

    shouldReturnPreferences() { return msgEvent.isLoadPreferencesEvent(this._msg); }

    static startLoadingTabState() { return msgEvent.createLoadTabStateEvent(this._msg); }
    
    static startAddingNote() { return msgEvent.createAddNoteEvent(); }

    shouldSetAddNoteMenuReady() { return msgEvent.isSetAddNoteReadyEvent(this._msg); }

    static startRemovingNote() { return msgEvent.createRemoveNoteEvent(); }

    shouldSetRemoveNoteMenuReady() { return msgEvent.isSetRemoveNoteReadyEvent(this._msg); }

    shouldAddNoteLinks() {
        const isAddingNoteLink = msgEvent.isAddNoteLinksEvent(this._msg);

        if (isAddingNoteLink)
            this._setNoteLinks();

        return isAddingNoteLink;
    }

    _setNoteLinks() { this._noteLinks = msgEvent.getNoteLinks(this._msg); }
    
    get noteLinks() { return this._noteLinks; }

    static startGoingToNote(noteId) { 
        return msgEvent.createGoToNoteEvent({ id: noteId });
    }
}
