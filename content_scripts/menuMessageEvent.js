import { ArrayExtension } from './arrayExtension.js';

class OptionList {
    static get storage() {
        return {
            section: 'storage',
            load: 'load',
            save: 'save',
            saveTo: 'save-to',
            noneCategory: 'preferences-none-category',
            getCategoryId: (index) => 'category-' + index
        };
    }

    static get marking() {
        return {
            mark: 'mark',
            unmark: 'unmark',
            setColour: 'palette'
        };
    }

    static get noting() {
        return {
            add: 'note-add',
            remove: 'note-remove',
            navigation: 'note-navigation'
        };
    }

    static get other() {
        return {
            preferences: 'preferences'
        };
    }
}

class MenuMessageEvent {
    constructor () {
        const markingOptions = OptionList.marking;
        this._markEvent = markingOptions.mark;
        this._markReadyEvent = 'setMarkReady';
        this._changeColourEvent = markingOptions.setColour;

        this._unmarkReadyEvent = 'setUnmarkReady';
        this._unmarkEvent = markingOptions.unmark;

        const storageOptions = OptionList.storage;
        this._saveReadyEvent = 'setSaveReady';
        this._saveEvent = storageOptions.save;

        this._addCategoriesEvent = 'addCategories';
        this._saveToCategoryEvent = storageOptions.saveTo;

        this._loadReadyEvent = 'setLoadReady';
        this._loadEvent = storageOptions.load;

        this._loadPreferencesEvent = 'loadPreferences';
        this._loadTabStateEvent = 'loadTabState';

        const noteOptions = OptionList.noting;
        this._addNoteReadyEvent = 'setAddNoteReady';
        this._addNoteEvent = noteOptions.add;

        this._removeNoteReadyEvent = 'setRemoveNoteReady';
        this._removeNoteEvent = noteOptions.remove;

        this._addNoteLinksEvent = 'addNoteLinks';
        this._goToNoteEvent = noteOptions.navigation;

        this._emitEvent = 'emit';

        this._updateShortcuts = 'updateShortcuts';

        this._props = {
            noteLink: 'noteLink',
            category: 'category',
            defaultCategory: 'defaultCategory',
            colourClass: 'colourClass',
            eventName: 'eventName',
            shortcuts: 'shortcuts'
        };
    }

    createMarkEvent(colourClass) { return this._createEventWithColour(this._markEvent, colourClass); }

    _createEventWithColour(eventName, colourClass) {
        return this._createEventWithArgs(eventName, {
            [this._props.colourClass]: colourClass
        });
    }

    _createEventWithArgs(eventName, options) {
        return Object.assign(this._createEvent(eventName), options);
    }

    _createEvent(eventName) { return { event: [eventName] }; }

    combineEvents(msgs = []) {
        msgs = msgs || [];

        const validMsgs = msgs.filter(m => m);

        if (!validMsgs.length)
            return null;

        if (validMsgs.length === 1)
            return validMsgs[0];

        return validMsgs.reduce((p, c) => {
            p.event.push(...c.event);

            this._combineProps(p, c, this._props.colourClass);
            this._combineProps(p, c, this._props.noteLink);
            this._combineProps(p, c, this._props.category);
            this._combineProps(p, c, this._props.defaultCategory);
            this._combineProps(p, c, this._props.eventName);
            this._combineProps(p, c, this._props.shortcuts);
            
            return p;
        }, { event: [] });
    }

    _combineProps(targetObj, sourceObj, propName) {
        if (sourceObj[propName])
            targetObj[propName] = sourceObj[propName];
    }

    isMarkEvent(msg) { return this._isEvent(msg, this._markEvent); }

    _isEvent(msg, eventName) { return msg && ArrayExtension.contains(msg.event, eventName); }

    getMarkColourClass(msg) { return msg ? msg[this._props.colourClass]: null; }

    createMarkReadyEvent() { return this._createEvent(this._markReadyEvent); }
    isSetMarkReadyEvent(msg) { return this._isEvent(msg, this._markReadyEvent); }

    createChangeColourEvent(colourClass) { 
        return this._createEventWithColour(this._changeColourEvent, colourClass); 
    }   
    isChangeColourEvent(msg) { return this._isEvent(msg, this._changeColourEvent); }

    createUnmarkReadyEvent() { return this._createEvent(this._unmarkReadyEvent); }
    isSetUnmarkReadyEvent(msg) { return this._isEvent(msg, this._unmarkReadyEvent); }

    createUnmarkEvent() { return this._createEvent(this._unmarkEvent); }
    isUnmarkEvent(msg) { return this._isEvent(msg, this._unmarkEvent); }

    createSaveReadyEvent() { return this._createEvent(this._saveReadyEvent); }
    isSetSaveReadyEvent(msg) { return this._isEvent(msg, this._saveReadyEvent); }

    createSaveEvent() { return this._createEvent(this._saveEvent); }
    isSaveEvent(msg) { return this._isEvent(msg, this._saveEvent); }   

    createAddCategoriesEvent(categoryTitles, defaultCategoryTitle) { 
        return this._createEventWithCategories(this._addCategoriesEvent, categoryTitles,
            defaultCategoryTitle); 
    }

    _createEventWithCategories(eventName, categoryTitles, defaultCategoryTitle = null) {
        return this._createEventWithArgs(eventName, { 
            [this._props.category]: categoryTitles,
            [this._props.defaultCategory]: defaultCategoryTitle
        });
    }

    isAddCategoriesEvent(msg) { return this._isEvent(msg, this._addCategoriesEvent); }

    getCategories(msg) { return msg ? msg[this._props.category]: []; }
    
    getDefaultCategory(msg) { return msg ? msg[this._props.defaultCategory]: null; }

    createSaveToCategoryEvent(categoryTitle) {
        return this._createEventWithCategories(this._saveToCategoryEvent, [categoryTitle]); 
    }
    isSaveToCategoryEvent(msg) { return this._isEvent(msg, this._saveToCategoryEvent); }

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

    createAddNoteLinksEvent(noteLinks) { 
        return this._createEventWithNoteLink(this._addNoteLinksEvent, noteLinks); 
    }
    
    _createEventWithNoteLink(eventName, noteLinks) {
        return this._createEventWithArgs(eventName, { [this._props.noteLink]: noteLinks });
    }

    isAddNoteLinksEvent(msg) { return this._isEvent(msg, this._addNoteLinksEvent); }

    getNoteLinks(msg) { return msg ? msg[this._props.noteLink]: []; }

    createGoToNoteEvent(noteLink) {
        return this._createEventWithNoteLink(this._goToNoteEvent, [noteLink]); 
    }
    isGoToNoteEvent(msg) { return this._isEvent(msg, this._goToNoteEvent); }

    createEmitEvent(eventName) {
        return this._createEventWithArgs(this._emitEvent, { [this._props.eventName]: eventName }); 
    }
    isEmitEvent(msg) { return this._isEvent(msg, this._emitEvent); }
    getEventName(msg) { return msg ? msg[this._props.eventName]: null; }

    createUpdateShortcutsEvent(shortcuts) { 
        return this._createEventWithArgs(this._updateShortcuts, { [this._props.shortcuts]: shortcuts }); 
    }
    isUpdateShortcuts(msg) { return this._isEvent(msg, this._updateShortcuts); }
    getShortcuts(msg) { return msg ? msg[this._props.shortcuts]: null; }
}

export { MenuMessageEvent, OptionList };
