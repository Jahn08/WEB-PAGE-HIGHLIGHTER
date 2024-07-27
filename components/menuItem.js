import { MenuIcon } from './menuIcon.js';
import { BrowserAPI } from '../content_scripts/browserAPI.js';

// TODO: make all the classes stateless
class BaseMenuItem {
    constructor(id, type) {
        this._id = id;
        this._type = type;

        this._isAdded = false;

        this._browser = new BrowserAPI();
    }

    get id() { return this._id; }

    get isAdded() { return this._isAdded; }

    async addToMenu(options = {}) {
        if (!this._isAdded) {
            options.id = this._id;
            options.type = this._type;

            if (!options.contexts || !options.contexts.length)
                options.contexts = ['all'];

            if (!options.title)
                options.title = this._compileTitle(this._browser.locale.getString(this._id));

            await this._browser.menus.create(options);

            return this._isAdded = true, this._isAdded;
        }

        return false;
    }

    _compileTitle(title) {
        return title;
    }

    async _removeFromMenu() {
        await this._browser.menus.remove(this._id);
        this._isAdded = false;
    }

    updateAvailability(isEnabled) {
        this.updateItem({
            enabled: isEnabled === true
        });
    }

    updateItem(options) {
        this._browser.menus.update(this._id, options);
    }
}

class SeparatorMenuItem extends BaseMenuItem {
    constructor() {
        const ctrlType = SeparatorMenuItem.TYPE;
        super(`${ctrlType}_${Date.now()}_${Math.floor(Math.random() * 10000)}`, ctrlType);
    }

    static get TYPE() { return 'separator'; }

    addToMenu() { return super.addToMenu(); }
}

class RadioSubMenuItem extends BaseMenuItem {
    constructor(id, parentId, title = null) {
        super(id, RadioSubMenuItem.TYPE);

        this._parentId = parentId;
        this._title = title;

        this._isChecked = false;
    }

    static get TYPE() { return 'radio'; }

    addToMenu(icon = new MenuIcon(), checked = false) {
        return super.addToMenu({
            icons : icon ? icon.getSettings() : null,
            checked: this._isChecked = checked,
            parentId: this._parentId,
            title: this._title
        });
    }

    get isChecked() { return this._isChecked; }

    check() { return this._updateCheckedState(true); }

    _updateCheckedState(checked) {
        if (checked === this._isChecked)
            return false;

        this.updateItem({
            checked: this._isChecked = checked
        });

        return true;
    }

    uncheck() { return this._updateCheckedState(false); }
}

class ButtonMenuItem extends BaseMenuItem {
    constructor (id, parentId = null, title = null) {
        super(id, ButtonMenuItem.TYPE);
    
        this._title = title;
        this._parentId = parentId;
        this._shortcut = null;
    }

    static get TYPE() { return 'normal'; }

    disable() { return this._setAvailability(false); }

    _setAvailability(isEnabled) {
        this.updateAvailability(isEnabled);
        return true;
    }

    enable() { return this._setAvailability(true); }
    
    addToMenu(icon = new MenuIcon(), enabled = false) {
        return this._addToMenu(icon, enabled);
    }

    _addToMenu(icon, enabled) {
        return super.addToMenu({
            icons : icon ? icon.getSettings() : null,
            parentId: this._parentId,
            title: this._title,
            enabled: enabled
        });
    }

    removeFromMenu() { 
        return super._removeFromMenu();
    }

    updateTitle(newTitile) {
        if (this._title === newTitile)
            return false;

        this._title = newTitile;
        this.updateItem({ title: this._compileTitle() });
        
        return true;
    }

    _compileTitle(title = this._title) { 
        if (!this._title) {
            if (!title)
                return null;

            this._title = title;
        }

        return title + (this._shortcut ? ` (${this._shortcut})` : '');
    }

    renderShortcut(shortcut) {
        if (this._shortcut === shortcut)
            return false;

        this._shortcut = shortcut;
        this.updateItem({ title: this._compileTitle() });

        return true;
    }
}

export { SeparatorMenuItem, ButtonMenuItem, RadioSubMenuItem };
