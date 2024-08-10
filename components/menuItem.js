import { MenuIcon } from './menuIcon.js';
import { BrowserAPI } from '../content_scripts/browserAPI.js';

class BaseMenuItem {
    constructor(id, type) {
        this._id = id;
        this._type = type;

        this._browser = new BrowserAPI();
    }

    get id() { return this._id; }

    async addToMenu(options = {}) {
        options.id = this._id;
        options.type = this._type;

        if (!options.contexts || !options.contexts.length)
            options.contexts = ['all'];

        if (!options.title)
            options.title = this._compileTitle(this._browser.locale.getString(this._id));

        await this._browser.menus.create(options);
    }

    _compileTitle(title) {
        return title;
    }

    async _removeFromMenu() {
        await this._browser.menus.remove(this._id);
    }

    updateAvailability(isEnabled) {
        return this.updateItem({ enabled: isEnabled === true });
    }

    async updateItem(options) {
        await this._browser.menus.update(this._id, options);
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
    }

    static get TYPE() { return 'radio'; }

    addToMenu(icon = new MenuIcon(), checked = false) {
        return super.addToMenu({
            icons : icon ? icon.getSettings() : null,
            checked: checked,
            parentId: this._parentId,
            title: this._title
        });
    }

    check() { return this._updateCheckedState(true); }

    _updateCheckedState(checked) { 
        return this.updateItem({ checked: checked });
    }
}

class ButtonMenuItem extends BaseMenuItem {
    constructor (id, parentId = null, title = null) {
        super(id, ButtonMenuItem.TYPE);
    
        this._title = title;
        this._parentId = parentId;
    }

    static get TYPE() { return 'normal'; }

    disable() { return this._setAvailability(false); }

    _setAvailability(isEnabled) {
        return this.updateAvailability(isEnabled);
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

    _compileTitle(title, shortcut) { 
        if (!this._title) {
            if (!title)
                return null;

            this._title = title;
        }

        return title + (shortcut ? ` (${shortcut})` : '');
    }

    renderShortcut(shortcut) {
        return this.updateItem({ title: this._compileTitle(this._title, shortcut) });
    }
}

export { SeparatorMenuItem, ButtonMenuItem, RadioSubMenuItem };
