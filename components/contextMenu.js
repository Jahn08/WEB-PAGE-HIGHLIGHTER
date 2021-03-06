import { ButtonMenuItem, SeparatorMenuItem, RadioSubMenuItem } from './menuItem.js';
import { MenuIcon } from './menuIcon.js';
import { ColourList } from './colourList.js';

export class ContextMenu {
    constructor() {
        const markingOptions = OptionList.marking;
        this._markBtn = new ButtonMenuItem(markingOptions.mark);
        this._unmarkBtn = new ButtonMenuItem(markingOptions.unmark);

        const notingOptions = OptionList.noting;
        this._addNoteBtn = new ButtonMenuItem(notingOptions.add);
        this._removeNoteBtn = new ButtonMenuItem(notingOptions.remove);

        const colours = ColourList.colours;

        this._defaultColourClass = colours[0].token;
        this._curColourClass = this._defaultColourClass;

        this.onMarking = null;
        this._markBtn.addToMenu(async () => {
            try {
                await this._passTabInfoToCallback(this.onMarking, 
                    {colourClass: this._curColourClass });
            }
            catch (ex) {
                console.error('Error while trying to mark: ' + ex.toString());
            }
        }, new MenuIcon('colourful-brush'));

        this.onUnmarking = null;
        this._unmarkBtn.addToMenu(async () => { 
            try {
                await this._passTabInfoToCallback(this.onUnmarking);
            }
            catch (ex) {
                console.error('Error while trying to unmark: ' + ex.toString());
            }
        }, new MenuIcon('white-brush'));

        this.onChangingColour = null;
        const changeColour = async (info) => {
            try {
                this._curColourClass = info.menuItemId;
                this.checkColourRadio(this._curColourClass);

                await this._passTabInfoToCallback(this.onChangingColour, 
                    { colourClass: this._curColourClass });
            }
            catch (ex) {
                console.error('Error while trying to change mark colour: ' + ex.toString());
            }
        };

        const setColourBtn = new ButtonMenuItem(markingOptions.setColour);
        setColourBtn.addToMenu(null, null, true);

        this._colourRadios = new Array(colours.length);

        ArrayExtension.runForEach(colours, (v, index) => {
            const radio = new RadioSubMenuItem(v.token, setColourBtn.id);
            this._colourRadios[index] = radio;
            
            radio.addToMenu(changeColour, v.icon, index === 0);
        });
        
        this._browser = new BrowserAPI();

        new SeparatorMenuItem().addToMenu();

        this.onAddingNote = null;
        this._addNoteBtn.addToMenu(async () => { 
            try {
                await this._passTabInfoToCallback(this.onAddingNote);
            }
            catch (ex) {
                console.error('Error while trying to add a note: ' + ex.toString());
            }
        }, new MenuIcon('in-note'));

        this.onRemovingNote = null;
        this._removeNoteBtn.addToMenu(async () => { 
            try {
                await this._passTabInfoToCallback(this.onRemovingNote);
            }
            catch (ex) {
                console.error('Error while trying to remove a note: ' + ex.toString());
            }
        }, new MenuIcon('out-note'));

        this.onGoingToNote = null;
        this._initNoteNavigation();

        this.onSaving = null;
        this.onLoading = null;
        this._initStorageOptions();

        this._emittableButtons = null;
    }

    async _passTabInfoToCallback(callback, options = {}) {
        if (!callback)
            return;

        const tabId = await this._getCurrentTabId();
        callback(Object.assign({ tabId }, options));
    }
    
    async _getCurrentTabId() {
        const activeTabs = await this._browser.tabs.getActiveTabs();

        if (!activeTabs || !activeTabs.length)
            throw new Error('No active tab was obtained');

        return activeTabs[0].id;
    }

    _initNoteNavigation() {
        if (this._noteNavigation) 
            return;    
        
        this._noteNavigation = new NoteNavigation(async info => {
            try {
                await this._passTabInfoToCallback(this.onGoingToNote, { noteId: info.menuItemId });
            }
            catch (ex) {
                console.error(`Error while trying to going to a note link with id=${info.menuItemId}: ` 
                    + ex.toString());
            }
        });
    }

    _initStorageOptions() {
        if (this._storageMenu)
            return;

        const onSavingFn = async (categoryTitle) => { 
            try {
                await this._passTabInfoToCallback(this.onSaving, { categoryTitle });
            }
            catch (ex) {
                console.error('Error while trying to save: ' + ex.toString());
            }
        };

        const onLoadingFn = async () => { 
            try {
                await this._passTabInfoToCallback(this.onLoading);
            }
            catch (ex) {
                console.error('Error while trying to load: ' + ex.toString());
            }
        };

        const noneCategoryName = this._browser.locale.getString(OptionList.storage.noneCategory);
        this._storageMenu = new PageStorageMenu(onSavingFn, onLoadingFn, noneCategoryName);
    }

    get currentColourClass() { return this._curColourClass; }

    disableMarkingBtn() { this._markBtn.disable(); }

    enableMarkingBtn() { this._markBtn.enable(); }

    disableUnmarkingBtn() { this._unmarkBtn.disable(); }
    
    enableUnmarkingBtn() { this._unmarkBtn.enable(); }

    disableAddingNoteBtn() { this._addNoteBtn.disable(); }

    enableAddingNoteBtn() { this._addNoteBtn.enable(); }

    disableRemovingNoteBtn() { this._removeNoteBtn.disable(); }

    enableRemovingNoteBtn() { this._removeNoteBtn.enable(); }

    disableSaveBtn() { this._storageMenu.disableSaveBtn(); }
    
    enableSaveBtn() { this._storageMenu.enableSaveBtn(); }

    disableLoadBtn() { this._storageMenu.disableLoadBtn(); }
    
    enableLoadBtn() { this._storageMenu.enableLoadBtn(); }

    checkColourRadio(colourClass = this._defaultColourClass) {
        const colourRadio = this._colourRadios.find(r => r.id === colourClass);

        if (!colourRadio)
            return;

        this._curColourClass = colourClass;
        
        if (colourRadio.check())
            ArrayExtension.runForEach(
                this._colourRadios.filter(r => r.id !== colourClass && r.isChecked), 
                c => c.uncheck());
    }

    renderShortcuts(shortcuts) {
        shortcuts = shortcuts || {};

        ArrayExtension.runForEach(this._getEmittableButtons(), btn =>
            btn.renderShortcut((shortcuts[btn.id] || {}).key));
    }

    _getEmittableButtons() {
        if (!this._emittableButtons) {
            this._emittableButtons = [this._markBtn, this._unmarkBtn, this._addNoteBtn, 
                this._removeNoteBtn];

            this._emittableButtons.push(...this._storageMenu.emittableButtons);
        }

        return this._emittableButtons;
    }

    renderNoteLinks(noteLinks) { this._noteNavigation.render(noteLinks); }

    appendNoteLink(noteId, noteText) {
        this._noteNavigation.appendLink(noteId, noteText);
    }

    removeNoteLink(noteId) {
        this._noteNavigation.removeLink(noteId);
    }

    renderPageCategories(categoryTitles, defaultCategoryTitle) { 
        this._storageMenu.render(categoryTitles, defaultCategoryTitle); 
    }

    emitItemClick(itemId) {
        const btn = this._getEmittableButtons().find(b => b.id === itemId && b.isEnabled);

        if (btn)
            btn.emitClick();
    }
}

class LinkMenu {
    constructor(menuId, onClickFn, parentMenuId = null) {
        this._onClickFn = onClickFn;
        this._menuBtn = new ButtonMenuItem(menuId, parentMenuId);

        this._menuLinks = [];
    }

    _appendLinkMenuBtn() {
        this._menuBtn.addToMenu();

        this._setMenuLinkBtnAvailability();
    }
    
    _setMenuLinkBtnAvailability() {
        return this._isMenuLinkBtnAvailable() ? this._menuBtn.enable() : 
            this._menuBtn.disable();
    }

    _isMenuLinkBtnAvailable() {
        return this._menuLinks.length > 0;
    }

    render(links) {
        links = links || [];
        
        if (!links.length)
            return this._menuBtn.disable();

        const updatedBtnIds = [];

        let wasUpdated = false;

        ArrayExtension.runForEach(links, li => {
            const existentLink = this._menuLinks.find(btn => btn.id === li.id);

            if (!existentLink) {
                this.appendLink(li.id, li.text);
                wasUpdated = true;
            }
            else if (existentLink.updateTitle(li.text))
                wasUpdated = true;

            updatedBtnIds.push(li.id);
        });

        ArrayExtension.runForEach(this._menuLinks, btn => {
            const btnId = btn.id;

            if (!updatedBtnIds.includes(btnId)) {
                this.removeLink(btnId);
                wasUpdated = true;
            }
        });

        return wasUpdated || this._setMenuLinkBtnAvailability();
    }

    appendLink(noteId, noteText) {
        const linkBtn = new ButtonMenuItem(noteId, this._menuBtn.id, noteText);
        this._menuLinks.push(linkBtn);
        
        linkBtn.addToMenu(this._onClickFn, null, true);

        this._setMenuLinkBtnAvailability();
    }

    removeLink(noteId) {
        const linkToRemove = this._menuLinks.find(li => li.id === noteId);

        if (!linkToRemove)
            return;

        linkToRemove.removeFromMenu();
        this._menuLinks = this._menuLinks.filter(li => li.id !== noteId);

        this._setMenuLinkBtnAvailability();
    }

    _createLink(id, text) {
        return {
            id,
            text
        };
    }
}

class NoteNavigation extends LinkMenu {
    constructor(onGoingToNoteFn) {
        super(OptionList.noting.navigation, onGoingToNoteFn);

        this._appendLinkMenuBtn();
    }
}

class PageStorageMenu extends LinkMenu {
    constructor(onSavingFn, onLoadingFn, noneCategoryName) {
        super(OptionList.storage.saveTo, async (info) => {
            const title = (this._defaultCategory || {})[info.menuItemId] || info.title;
            await onSavingFn(title === this._noneCategoryName ? null: title);
        }, PageStorageMenu._PARENT_MENU_ID);

        this._noneCategoryName = noneCategoryName;

        this._defaultCategory = null;

        this._storageBtn = null;
        this._saveBtn = null;
        this._loadBtn = null;

        this._init(onSavingFn, onLoadingFn);
    }

    get emittableButtons() { return [this._saveBtn, this._loadBtn]; }
    
    _isMenuLinkBtnAvailable() {
        return this._saveBtn.isEnabled && super._isMenuLinkBtnAvailable();
    }

    static get _PARENT_MENU_ID() { return OptionList.storage.section; }

    _init(onSavingFn, onLoadingFn) {
        if (this._storageBtn)
            return;

        new SeparatorMenuItem().addToMenu();

        const storageOptionId = PageStorageMenu._PARENT_MENU_ID;
        this._storageBtn = new ButtonMenuItem(storageOptionId);
        this._storageBtn.addToMenu();

        this._storageOptions = OptionList.storage;
        const saveIcon = new MenuIcon(this._storageOptions.save);
        this._saveBtn = new ButtonMenuItem(this._storageOptions.save, storageOptionId);
        this._saveBtn.addToMenu(async () => await onSavingFn(), saveIcon);

        this._appendLinkMenuBtn();

        this._loadBtn = new ButtonMenuItem(this._storageOptions.load, storageOptionId);
        this._loadBtn.addToMenu(onLoadingFn, new MenuIcon(this._storageOptions.load));
    }

    render(categoryTitles, defaultCategoryTitle) {
        super.render(this._getCategoryLinks(categoryTitles, defaultCategoryTitle));
    }

    _getCategoryLinks(categoryTitles, defaultCategoryTitle) {
        defaultCategoryTitle = defaultCategoryTitle || this._noneCategoryName;

        this._defaultCategory = null;

        const categories = (categoryTitles || []);

        if (!categories.length)
            return [];

        return [this._noneCategoryName].concat(categories)
            .map((title, index) => {
                const isDefaultOption = title === defaultCategoryTitle;

                const optionId = this._storageOptions.getCategoryId(index);

                if (isDefaultOption)
                    this._defaultCategory = { [optionId]: defaultCategoryTitle };

                return this._createLink(optionId, (isDefaultOption ? '✓ ': '') + title);
            });
    }

    disableSaveBtn() { 
        if (!this._saveBtn.disable())
            return;

        this._changeSavingRelatedBtnsAvailability();
    }

    _changeSavingRelatedBtnsAvailability() {
        this._setParentBtnAvailability(true);
        this._setMenuLinkBtnAvailability(); 
    }
    
    _setParentBtnAvailability(availabilityChanged) {
        if (!availabilityChanged)
            return;

        if (this._saveBtn.isEnabled || this._loadBtn.isEnabled)
            this._storageBtn.enable();
        else
            this._storageBtn.disable();
    }

    enableSaveBtn() { 
        if (!this._saveBtn.enable())
            return;

        this._changeSavingRelatedBtnsAvailability();
    }

    disableLoadBtn() { this._setParentBtnAvailability(this._loadBtn.disable()); }
    
    enableLoadBtn() { this._setParentBtnAvailability(this._loadBtn.enable()); }
}
