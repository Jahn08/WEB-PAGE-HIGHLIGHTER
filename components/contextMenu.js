import { ButtonMenuItem, SeparatorMenuItem, RadioSubMenuItem } from './menuItem.js';
import { MenuIcon } from './menuIcon.js';
import { ColourList } from './colourList.js';

export class ContextMenu {
    constructor() {
        this._isDirty = false;
        this._isRendered = false;
    
        this._markBtn = new ButtonMenuItem('mark', 'Mark selected text');
        this._unmarkBtn = new ButtonMenuItem('unmark', 'Unmark selected text');

        this._addNoteBtn = new ButtonMenuItem('add note', 'Add a note');
        this._removeNoteBtn = new ButtonMenuItem('remove note', 'Remove a note');

        this._saveBtn = new ButtonMenuItem('save', 'Save Page');
        this._loadBtn = new ButtonMenuItem('load', 'Load Page');

        const defaultColourClass = 'marker-green';
        this._curColourClass = defaultColourClass;

        this.onMarking = null;
        this._markBtn.addToSelectionMenu(async () => {
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
    
        this._unmarkBtn.hide();

        this.onChangingColour = null;
        const changeColour = async (info) => {
            try {
                this._curColourClass = info.menuItemId;

                await this._passTabInfoToCallback(this.onChangingColour, 
                    { colourClass: this._curColourClass });
            }
            catch (ex) {
                console.error('Error while trying to change mark colour: ' + ex.toString());
            }
        };

        const paletteMenuItemId = 'palette';
        const setColourBtn = new ButtonMenuItem(paletteMenuItemId, 'Set mark colour');
        setColourBtn.addToMenu(null, new MenuIcon(paletteMenuItemId));

        this._colourRadios = [];

        ColourList.colours.forEach((v, index) => {
            const radio = new RadioSubMenuItem(v.token, setColourBtn.id, v.title);
            this._colourRadios.push(radio);
            
            radio.addToMenu(changeColour, v.icon, index === 0);
        });
        
        browser.menus.onShown.addListener(() => {
            if (this._shouldBeRefreshed())
                browser.menus.refresh();
        });

        this.onAddingNote = null;
        this._addNoteBtn.addToMenu(async () => { 
            try {
                await this._passTabInfoToCallback(this.onAddingNote);
            }
            catch (ex) {
                console.error('Error while trying to add a note: ' + ex.toString());
            }
        }/*, new MenuIcon('addNote')*/);
        this._addNoteBtn.hide();

        this.onRemovingNote = null;
        this._removeNoteBtn.addToMenu(async () => { 
            try {
                await this._passTabInfoToCallback(this.onRemovingNote);
            }
            catch (ex) {
                console.error('Error while trying to remove a note: ' + ex.toString());
            }
        }/*, new MenuIcon('removeNote')*/);
        this._removeNoteBtn.hide();

        new SeparatorMenuItem().addToMenu();

        this.onSaving = null;
        this._saveBtn.addToMenu(async () => { 
            try {
                await this._passTabInfoToCallback(this.onSaving);
            }
            catch (ex) {
                console.error('Error while trying to save: ' + ex.toString());
            }
        }, new MenuIcon('save'));
        this._saveBtn.hide();

        this.onLoading = null;
        this._loadBtn.addToMenu(async () => { 
            try {
                await this._passTabInfoToCallback(this.onLoading);
            }
            catch (ex) {
                console.error('Error while trying to load: ' + ex.toString());
            }
        }, new MenuIcon('load'));
        this._loadBtn.hide();

        browser.menus.onHidden.addListener(() => this._makePure());

        this._noteNavigationInstance = null;
        this.onGoingToNote = null;
    }

    async _passTabInfoToCallback(callback, options = {}) {
        if (!callback)
            return;

        const tabId = await this._getCurrentTabId();
        callback(Object.assign({ tabId }, options));
    }
    
    async _getCurrentTabId() {
        const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });

        if (!activeTabs || !activeTabs.length)
            throw new Error('No active tab was obtained');

        return activeTabs[0].id;
    }

    _shouldBeRefreshed() { return this._isDirty && !this._isRendered; }

    _makePure() {
        this._isDirty = false;
        this._isRendered = false;
    }

    render() { this._isRendered = true; }

    get currentColourClass() { return this._curColourClass; }

    hideMarkingBtn() { this._makeDirty(this._markBtn.hide()); }

    _makeDirty(shouldBeDirty) {
        if (shouldBeDirty)
            this._isDirty = true;
    }

    showMarkingBtn() { this._makeDirty(this._markBtn.show()); }

    hideUnmarkingBtn() { this._makeDirty(this._unmarkBtn.hide()); }
    
    showUnmarkingBtn() { this._makeDirty(this._unmarkBtn.show()); }

    hideAddingNoteBtn() { this._makeDirty(this._addNoteBtn.hide()); }

    showAddingNoteBtn() { this._makeDirty(this._addNoteBtn.show()); }
    
    hideRemovingNoteBtn() { this._makeDirty(this._removeNoteBtn.hide()); }

    showRemovingNoteBtn() { this._makeDirty(this._removeNoteBtn.show()); }

    hideSaveBtn() { this._saveBtn.hide(); }
    
    showSaveBtn() { this._saveBtn.show(); }

    hideLoadBtn() { this._loadBtn.hide(); }
    
    showLoadBtn() { this._loadBtn.show(); }

    checkColourRadio(colourClass) {
        const colourRadio = this._getColourRadio(colourClass);

        if (!colourRadio)
            return;

        this._curColourClass = colourClass;
        colourRadio.check();
    }

    _getColourRadio(colourClass) {
        return this._colourRadios.find(r => r.id === colourClass);
    }

    get _noteNavigation() {
        if (!this._noteNavigationInstance) 
            this._noteNavigationInstance = new NoteNavigation(async info => {
                try {
                    await this._passTabInfoToCallback(this.onGoingToNote, { noteId: info.menuItemId });
                }
                catch (ex) {
                    console.error(`Error while trying to going to a note link with id=${info.menuItemId}: ` 
                        + ex.toString());
                }
            });

        return this._noteNavigationInstance;
    }

    renderNoteLinks(noteLinks) {
        this._noteNavigation.render(noteLinks);
    }

    appendNoteLink(noteId, noteText) {
        this._noteNavigation.appendLink(noteId, noteText);
    }

    removeNoteLink(noteId) {
        this._noteNavigation.removeLink(noteId);
    }
}

class NoteNavigation {
    constructor(onGoingToNoteFn) {
        this._onGoingToNote = onGoingToNoteFn;
        
        this._noteLinkBtns = [];

        this._noteNavigationBtn = null;
    }

    render(noteLinks) {
        noteLinks = noteLinks || [];
        
        if (this._noteLinkBtns.length) {
            this._noteLinkBtns.forEach(li => li.removeFromMenu());
            this._noteLinkBtns = [];
        }
        
        if (!noteLinks.length)
            return this._removeNavigationButton();

        noteLinks.forEach(li => this.appendLink(li.id, li.text));
    }

    _initNavigationBtn() {
        if (this._noteNavigationBtn)
            return;

        const noteLinksMenuId = 'noteNavigation';
        this._noteNavigationBtn = new ButtonMenuItem(noteLinksMenuId, 'Note Links');
        this._noteNavigationBtn.addToMenu();
    }

    _removeNavigationButton() {
        if (!this._noteNavigationBtn || this._noteLinkBtns.length)
            return;

        this._noteNavigationBtn.removeFromMenu();
        this._noteNavigationBtn = null;
    }

    appendLink(noteId, noteText) {
        this._initNavigationBtn();

        const linkBtn = new ButtonMenuItem(noteId, noteText, this._noteNavigationBtn.id);
        this._noteLinkBtns.push(linkBtn);
        
        linkBtn.addToMenu(this._onGoingToNote);
    }

    removeLink(noteId) {
        const linkToRemove = this._noteLinkBtns.find(li => li.id === noteId);

        if (!linkToRemove)
            return;

        linkToRemove.removeFromMenu();
        this._noteLinkBtns = this._noteLinkBtns.filter(li => li.id !== noteId);

        this._removeNavigationButton();
    }
}
