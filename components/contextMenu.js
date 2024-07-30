import { ButtonMenuItem, SeparatorMenuItem, RadioSubMenuItem } from './menuItem.js';
import { MenuIcon } from './menuIcon.js';
import { ColourList } from './colourList.js';
import { ArrayExtension } from '../content_scripts/arrayExtension.js';
import { BrowserAPI } from '../content_scripts/browserAPI.js';
import { OptionList } from '../content_scripts/menuMessageEvent.js';
import { MessageSender } from './messageSender.js';

export class ContextMenu {
    constructor() {
        const markingOptions = OptionList.marking;
        this._markBtn = new ButtonMenuItem(markingOptions.mark);
        this._unmarkBtn = new ButtonMenuItem(markingOptions.unmark);

        const notingOptions = OptionList.noting;
        this._addNoteBtn = new ButtonMenuItem(notingOptions.add);
        this._removeNoteBtn = new ButtonMenuItem(notingOptions.remove);

        this._colourRadios = new Array(ContextMenu._colours.length);

        this._setColourBtn = new ButtonMenuItem(markingOptions.setColour);

        ArrayExtension.runForEach(ContextMenu._colours, (v, index) => {
            this._colourRadios[index] = new RadioSubMenuItem(v.token, this._setColourBtn.id);
        });
        
        this._noteNavigation = new NoteNavigation();

        const noneCategoryName = new BrowserAPI().locale.getString(OptionList.storage.noneCategory);
        this._storageMenu = new PageStorageMenu(noneCategoryName);

        this._emittableButtons = null;
    }

    async render() {
        await this._markBtn.addToMenu(new MenuIcon('colourful-brush'));
        
        await this._unmarkBtn.addToMenu(new MenuIcon('white-brush'));

        await this._setColourBtn.addToMenu(null, true);

        ArrayExtension.runForEach(ContextMenu._colours, async (v, index) => {
            const radio = this._colourRadios[index];
            await radio.addToMenu(v.icon, index === 0);
        });

        await new SeparatorMenuItem().addToMenu();

        await this._addNoteBtn.addToMenu(new MenuIcon('in-note'));

        await this._removeNoteBtn.addToMenu(new MenuIcon('out-note'));

        await this._noteNavigation.render();

        await this._storageMenu.render();

        new BrowserAPI().menus.onClicked(ContextMenu._onClick);
    }

    static _onClick(info) {
        const menu = new ContextMenu();
        switch(info.menuItemId) {
            case menu._markBtn.id:
                return ContextMenu._onMarking();
            case menu._unmarkBtn.id:
                return ContextMenu._onUnmarking();
            case menu._addNoteBtn.id:
                return ContextMenu._onAddingNote();
            case menu._removeNoteBtn.id:
                return ContextMenu._onRemovingNote();
            case menu._storageMenu.saveBtnId:
                return ContextMenu._onSaving();
            case menu._storageMenu.loadBtnId:
                return ContextMenu._onLoading();
            default:
                if(info.parentMenuItemId === menu._setColourBtn.id)
                    return ContextMenu._onChangingColour(info);
                else if(info.parentMenuItemId === menu._noteNavigation.parentId)
                    return ContextMenu._onGoingToNote(info);
                else if(info.parentMenuItemId === menu._storageMenu.parentId)
                    return ContextMenu._onSaving(PageStorageMenu.getCategoryTitle(info));
        }
    }

    static async _onMarking() {
        try {
            await ContextMenu._passTabInfoToCallback(MessageSender.sendMarking);
        } catch (ex) {
            console.error('Error while marking: ' + ex.toString());
        }
    }

    static async _onUnmarking() {
        try {
            await ContextMenu._passTabInfoToCallback(MessageSender.sendUnmarking);
        } catch (ex) {
            console.error('Error while unmarking: ' + ex.toString());
        }
    }

    static async _onChangingColour(info) {
        try {
            const changedColourClass = info.menuItemId;
            new ContextMenu().checkColourRadio(changedColourClass);

            await ContextMenu._passTabInfoToCallback(MessageSender.sendChangingColour, { colourClass: changedColourClass });
        } catch (ex) {
            console.error('Error while changing a mark colour: ' + ex.toString());
        }
    }

    static async _onAddingNote() {
        try {
            await ContextMenu._passTabInfoToCallback(info => MessageSender.sendAddingNote(info, new ContextMenu()));
        } catch (ex) {
            console.error('Error while adding a note: ' + ex.toString());
        }
    }

    static async _onRemovingNote() {
        try {
            await ContextMenu._passTabInfoToCallback(info => MessageSender.sendRemovingNote(info, new ContextMenu()));
        } catch (ex) {
            console.error('Error while removing a note: ' + ex.toString());
        }
    }

    static async _onSaving(categoryTitle = null) {
        try {
            await ContextMenu._passTabInfoToCallback(MessageSender.sendSaving, { categoryTitle });
        } catch (ex) {
            console.error('Error while saving: ' + ex.toString());
        }
    }

    static async _onLoading() {
        try {
            await ContextMenu._passTabInfoToCallback(MessageSender.sendLoading);
        } catch (ex) {
            console.error('Error while loading: ' + ex.toString());
        }
    }

    static async _onGoingToNote(info) {
        try {
            await ContextMenu._passTabInfoToCallback(MessageSender.sendGoingToNote, { noteId: info.menuItemId });
        } catch (ex) {
            console.error(`Error while going to a note link with id=${info.menuItemId}: ${ex.toString()}`);
        }
    }

    static async _passTabInfoToCallback(callback, options = {}) {
        if (!callback)
            return;

        const tabId = await ContextMenu._getCurrentTabId();
        callback(Object.assign({ tabId }, options));
    }
    
    static async _getCurrentTabId() {
        const activeTabs = await new BrowserAPI().tabs.getActiveTabs();

        if (!activeTabs || !activeTabs.length)
            throw new Error('No active tab was obtained');

        return activeTabs[0].id;
    }

    static get _defaultColourClass() { return ContextMenu._colours[0].token; }

    static get _colours() { return ColourList.colours; }

    disableMarkingBtn() { this._markBtn.disable(); }

    enableMarkingBtn() { this._markBtn.enable(); }

    disableUnmarkingBtn() { this._unmarkBtn.disable(); }
    
    enableUnmarkingBtn() { this._unmarkBtn.enable(); }

    disableAddingNoteBtn() { this._addNoteBtn.disable(); }

    enableAddingNoteBtn() { this._addNoteBtn.enable(); }

    disableRemovingNoteBtn() { this._removeNoteBtn.disable(); }

    enableRemovingNoteBtn() { this._removeNoteBtn.enable(); }

    disableSaveBtn() { this._storageMenu.disableSaveBtn(); }
    
    enableSaveBtn(shouldEnableSaveToMenu) { this._storageMenu.enableSaveBtn(shouldEnableSaveToMenu); }

    disableLoadBtn() { this._storageMenu.disableLoadBtn(); }
    
    enableLoadBtn() { this._storageMenu.enableLoadBtn(); }

    checkColourRadio(colourClass = ContextMenu._defaultColourClass) {
        const colourRadio = this._colourRadios.find(r => r.id === colourClass);
        if (!colourRadio)
            return;
        
        if (colourRadio.check())
            ArrayExtension.runForEach(
                this._colourRadios.filter(r => r.id !== colourClass && r.isChecked), c => c.uncheck()
            );

        return colourClass;
    }

    renderShortcuts(shortcuts) {
        shortcuts = shortcuts || {};
        ArrayExtension.runForEach(this._getEmittableButtons(), btn => btn.renderShortcut((shortcuts[btn.id] || {}).key));
    }

    _getEmittableButtons() {
        if (!this._emittableButtons) {
            this._emittableButtons = [this._markBtn, this._unmarkBtn, this._addNoteBtn, 
                this._removeNoteBtn];

            this._emittableButtons.push(...this._storageMenu.emittableButtons);
        }

        return this._emittableButtons;
    }

    renderNoteLinks(noteLinks) { 
        return this._noteNavigation.renderLinks(noteLinks); 
    }

    appendNoteLink(noteId, noteText) {
        return this._noteNavigation.appendLink(noteId, noteText);
    }

    removeNoteLink(noteId) {
        return new BrowserAPI().menus.remove(noteId);
    }

    renderPageCategories(categoryTitles, defaultCategoryTitle) {
        return this._storageMenu.renderLinks(categoryTitles, defaultCategoryTitle); 
    }

    async emitItemClick(itemId) {
        const btn = this._getEmittableButtons().find(b => b.id === itemId);
        if (btn)
            await ContextMenu._onClick({ menuItemId: itemId });
    }
}

class LinkMenu {
    constructor(menuId, parentMenuId = null) {
        this._menuBtn = new ButtonMenuItem(menuId, parentMenuId);
    }

    _appendLinkMenuBtn() {
        return this._menuBtn.addToMenu();
    }

    get parentId() {
        return this._menuBtn.id;        
    }

    async renderLinks(links) {
        links = links || [];
        
        await this._menuBtn.removeFromMenu();
        await this._menuBtn.addToMenu();

        if (!links.length)
            return this._menuBtn.disable();

        await Promise.all(links.map(li => this.appendLink(li.id, li.text)));
        return this._menuBtn.enable();
    }

    async appendLink(noteId, noteText) {
        const linkBtn = new ButtonMenuItem(noteId, this._menuBtn.id, noteText);
        await linkBtn.addToMenu(null, true);

        this._menuBtn.enable();
    }

    _createLink(id, text) {
        return {
            id,
            text
        };
    }
}

class NoteNavigation extends LinkMenu {
    constructor() {
        super(OptionList.noting.navigation);
    }

    render() {
        return this._appendLinkMenuBtn();
    }
}

class PageStorageMenu extends LinkMenu {
    constructor(noneCategoryName) {
        super(OptionList.storage.saveTo, PageStorageMenu._storageOptionId);

        this._noneCategoryName = noneCategoryName;

        this._storageBtn = new ButtonMenuItem(PageStorageMenu._storageOptionId);

        this._saveBtn = new ButtonMenuItem(PageStorageMenu._storageOptions.save, PageStorageMenu._storageOptionId);
        this._loadBtn = new ButtonMenuItem(PageStorageMenu._storageOptions.load, PageStorageMenu._storageOptionId);
    }

    async render() {
        await new SeparatorMenuItem().addToMenu();

        await this._storageBtn.addToMenu();

        const saveIcon = new MenuIcon(this.saveBtnId);
        await this._saveBtn.addToMenu(saveIcon);

        await this._appendLinkMenuBtn();

        await this._loadBtn.addToMenu(new MenuIcon(this.loadBtnId));
    }

    get emittableButtons() { return [this._saveBtn, this._loadBtn]; }

    get saveBtnId() {
        return this._saveBtn.id;
    }
    
    get loadBtnId() {
        return this._loadBtn.id;
    }

    static get _storageOptions() { return OptionList.storage; }

    static get _storageOptionId() { return OptionList.storage.section; }

    static getCategoryTitle(info) {
        return PageStorageMenu._storageOptions.getCategoryTitleFromId(info.menuItemId);
    }

    renderLinks(categoryTitles, defaultCategoryTitle) {
        return super.renderLinks(this._getCategoryLinks(categoryTitles, defaultCategoryTitle));
    }
    
    _getCategoryLinks(categoryTitles, defaultCategoryTitle) {
        defaultCategoryTitle = defaultCategoryTitle || this._noneCategoryName;

        const categories = (categoryTitles || []);

        if (!categories.length)
            return [];

        return [this._noneCategoryName].concat(categories).map((title, index) => {
            const isDefaultOption = title === defaultCategoryTitle;
            const optionId = PageStorageMenu._storageOptions.getCategoryId(index, title);
            return this._createLink(optionId, (isDefaultOption ? '✓ ': '') + title);
        });
    }

    disableSaveBtn() { 
        if (!this._saveBtn.disable())
            return;

        this._menuBtn.disable();
    }

    enableSaveBtn(shouldEnableSaveToMenu = false) { 
        if (!this._saveBtn.enable())
            return;

        this._storageBtn.enable();
        if(shouldEnableSaveToMenu)
            this._menuBtn.enable();
    }

    disableLoadBtn() { this._loadBtn.disable(); }
    
    enableLoadBtn() { 
        this._loadBtn.enable(); 
        this._storageBtn.enable();
    }
}
