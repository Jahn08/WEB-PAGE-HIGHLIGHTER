import { MenuMessageEvent } from '../content_scripts/menuMessageEvent.js';

const msgEvent = new MenuMessageEvent();

export class SenderMessage {
    constructor (msg) {
        this._msg = msg;
    }

    shouldSetMarkMenuReady() { return msgEvent.isSetMarkReadyEvent(this._msg); }

    shouldSetUnmarkMenuReady() { return msgEvent.isSetUnmarkReadyEvent(this._msg); }

    static startMarking() { return msgEvent.createMarkEvent(); }

    static startChangingColour(colourClass) { return msgEvent.createChangeColourEvent(colourClass); }

    static startUnmarking() { return msgEvent.createUnmarkEvent(); }

    shouldSetSaveMenuReady() { return msgEvent.isSetSaveReadyEvent(this._msg); }

    static startSaving() { return msgEvent.createSaveEvent(); }

    shouldAddCategories() { return msgEvent.isAddCategoriesEvent(this._msg); }

    get categories() { return msgEvent.getCategories(this._msg); }

    get defaultCategory() { return msgEvent.getDefaultCategory(this._msg); }

    static startSavingToCategory(categoryTitle) {  return msgEvent.createSaveToCategoryEvent(categoryTitle); }

    shouldSetLoadMenuReady() { return msgEvent.isSetLoadReadyEvent(this._msg); }

    static startLoading() { return msgEvent.createLoadEvent(); }

    shouldLoadPreferences() { return msgEvent.isLoadPreferencesEvent(this._msg); }

    static startLoadingTabState() { return msgEvent.createLoadTabStateEvent(this._msg); }
    
    static startAddingNote() { return msgEvent.createAddNoteEvent(); }

    shouldSetAddNoteMenuReady() { return msgEvent.isSetAddNoteReadyEvent(this._msg); }

    static startRemovingNote() { return msgEvent.createRemoveNoteEvent(); }

    shouldSetRemoveNoteMenuReady() { return msgEvent.isSetRemoveNoteReadyEvent(this._msg); }

    shouldAddNoteLinks() { return msgEvent.isAddNoteLinksEvent(this._msg); }

    get noteLinks() { return msgEvent.getNoteLinks(this._msg); }

    static startGoingToNote(noteId) {  return msgEvent.createGoToNoteEvent({ id: noteId }); }

    shouldEmitEvent() { return msgEvent.isEmitEvent(this._msg); }
    
    get eventName() { return msgEvent.getEventName(this._msg); }

    shouldUpdateShortcuts() { return msgEvent.isUpdateShortcuts(this._msg); }
    
    get shortcuts() { return msgEvent.getShortcuts(this._msg); }
}
