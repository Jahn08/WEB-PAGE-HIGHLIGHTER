const msgEvent = new MenuMessageEvent();

export class MessageSender {
    constructor (msg) {
        this._msg = msg;

        this._noteLinks = [];
        this._categories = [];
    }

    shouldSetMarkMenuReady() { return msgEvent.isSetMarkReadyEvent(this._msg); }

    shouldSetUnmarkMenuReady() { return msgEvent.isSetUnmarkReadyEvent(this._msg); }

    static startMarking(colourClass) { return msgEvent.createMarkEvent(colourClass); }

    static startChangingColour(colourClass) { return msgEvent.createChangeColourEvent(colourClass); }

    static startUnmarking() { return msgEvent.createUnmarkEvent(); }

    shouldSetSaveMenuReady() { return msgEvent.isSetSaveReadyEvent(this._msg); }

    static startSaving() { return msgEvent.createSaveEvent(); }

    shouldAddCategories() {
        const isAddingCategories = msgEvent.isAddCategoriesEvent(this._msg);

        if (isAddingCategories)
            this._setCategories();

        return isAddingCategories;
    }

    _setCategories() { this._categories = msgEvent.getCategories(this._msg); }
    
    get categories() { return this._categories; }

    static startSavingToCategory(categoryTitle) { 
        return msgEvent.createSaveToCategoryEvent(categoryTitle);
    }

    shouldSetLoadMenuReady() { return msgEvent.isSetLoadReadyEvent(this._msg); }

    static startLoading() { return msgEvent.createLoadEvent(); }

    shouldLoadPreferences() { return msgEvent.isLoadPreferencesEvent(this._msg); }

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
