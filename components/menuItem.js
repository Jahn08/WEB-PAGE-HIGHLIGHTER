import { MenuIcon } from './menuIcon.js';

class BaseMenuItem {
    constructor(id, type) {
        this._id = id;
        this._type = type;

        this._isAdded = false;

        this._browser = new BrowserAPI();
    }

    get id() { return this._id; }

    get isAdded() { return this._isAdded; }

    addToMenu(options = {}) {
        if (!this._isAdded) {
            options.id = this._id;
            options.type = this._type;

            if (!options.contexts || !options.contexts.length)
                options.contexts = ['all'];

            if (!options.title)
                options.title = this._compileTitle(this._browser.locale.getString(this._id));

            this._browser.menus.create(options);

            return this._isAdded = true, this._isAdded;
        }

        return false;
    }

    _compileTitle(title) {
        return title;
    }

    _removeFromMenu() {
        this._browser.menus.remove(this._id);
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

    addToMenu() { super.addToMenu(); }
}

class RadioSubMenuItem extends BaseMenuItem {
    constructor(id, parentId, title = null) {
        super(id, RadioSubMenuItem.TYPE);

        this._parentId = parentId;
        this._title = title;

        this._isChecked = false;
    }

    static get TYPE() { return 'radio'; }

    addToMenu(onchange, icon = new MenuIcon(), checked = false) {
        super.addToMenu({
            icons : icon ? icon.getSettings() : null,
            checked: this._isChecked = checked,
            parentId: this._parentId,
            title: this._title,
            onclick: onchange
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
        this._enabled = false;

        this._parentId = parentId;

        this._onclick = null;

        this._shortcut = null;
    }

    static get TYPE() { return 'normal'; }

    disable() { return this._setAvailability(false); }

    _setAvailability(isEnabled) {
        if (isEnabled === this._enabled)
            return false;

        this.updateAvailability(this._enabled = isEnabled);
        return true;
    }

    enable() { return this._setAvailability(true); }
    
    get isEnabled() { return this._enabled; }

    addToMenu(onclick, icon = new MenuIcon(), enabled = false) {
        this._enabled = enabled;

        this._addToMenu(onclick, icon);
    }

    _addToMenu(onclick, icon) {
        this._onclick = info => onclick(Object.assign(info, { title: this._title }));

        super.addToMenu({
            icons : icon ? icon.getSettings() : null,
            parentId: this._parentId,
            onclick: this._onclick,
            title: this._title,
            enabled: this._enabled
        });
    }

    removeFromMenu() { super._removeFromMenu(); }

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

    emitClick() {
        if (this.isEnabled && this._onclick)
            this._onclick({});
    }
}

export { SeparatorMenuItem, ButtonMenuItem, RadioSubMenuItem };
