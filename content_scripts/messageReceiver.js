class MessageReceiver {
    constructor (msg) {
        this._msg = msg;       
        this._markColourClass = null;
        this._noteLink = null;
        this._category = null;
    }

    get markColourClass() { return this._markColourClass; }

    shouldMark() {
        return MessageReceiver.msgEvent.isMarkEvent(this._msg) && this._setColourClass();
    }

    _setColourClass() { 
        this._markColourClass = MessageReceiver.msgEvent.getMarkColourClass(this._msg);
        return this._markColourClass ? true: false;
    }

    shouldChangeColour() { 
        return MessageReceiver.msgEvent.isChangeColourEvent(this._msg) && this._setColourClass(); 
    }

    shouldUnmark() { return MessageReceiver.msgEvent.isUnmarkEvent(this._msg); }

    static setMarkMenuReady() { 
        return MessageReceiver.msgEvent.createMarkReadyEvent(); 
    }

    static setUnmarkMenuReady() { return MessageReceiver.msgEvent.createUnmarkReadyEvent(); }

    static setSaveMenuReady() { return MessageReceiver.msgEvent.createSaveReadyEvent(); }

    shouldSave() { return MessageReceiver.msgEvent.isSaveEvent(this._msg); }

    static addCategories(categoryTitles, defauflCategoryTitle) { 
        return MessageReceiver.msgEvent.createAddCategoriesEvent(categoryTitles, 
            defauflCategoryTitle); 
    }

    shouldSaveToCategory() {
        return MessageReceiver.msgEvent.isSaveToCategoryEvent(this._msg) && this._setCategory();
    }

    _setCategory() { 
        this._category = MessageReceiver.msgEvent.getCategories(this._msg)[0];
        return this._category !== undefined;
    }

    get category() { return this._category; }

    static setLoadMenuReady() { return MessageReceiver.msgEvent.createLoadReadyEvent(); }

    shouldLoad() { return MessageReceiver.msgEvent.isLoadEvent(this._msg); }

    static combineEvents(...msgs) { return MessageReceiver.msgEvent.combineEvents(msgs); }

    static loadPreferences() { return MessageReceiver.msgEvent.createLoadPreferencesEvent(); }

    shouldReturnTabState() { return MessageReceiver.msgEvent.isLoadTabStateEvent(this._msg); }

    static setAddNoteMenuReady() { return MessageReceiver.msgEvent.createAddNoteReadyEvent(); }

    shouldAddNote() { return MessageReceiver.msgEvent.isAddNoteEvent(this._msg); }

    static setRemoveNoteMenuReady() { return MessageReceiver.msgEvent.createRemoveNoteReadyEvent(); }

    shouldRemoveNote() { return MessageReceiver.msgEvent.isRemoveNoteEvent(this._msg); }
    
    static addNoteLinks(noteLinks) { 
        return MessageReceiver.msgEvent.createAddNoteLinksEvent(noteLinks); 
    }

    shouldGoToNote() {
        return MessageReceiver.msgEvent.isGoToNoteEvent(this._msg) && this._setNoteLink();
    }

    _setNoteLink() { 
        this._noteLink = MessageReceiver.msgEvent.getNoteLinks(this._msg)[0];
        return this._noteLink ? true: false;
    }

    get noteLink() { return this._noteLink; }

    static emitEvent(eventName) {
        return MessageReceiver.msgEvent.createEmitEvent(eventName);
    }
}

MessageReceiver.msgEvent = new MenuMessageEvent();