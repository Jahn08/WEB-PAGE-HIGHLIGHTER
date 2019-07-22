import { MenuIcon } from './menuIcon.js';

class BaseMenuItem {
    constructor(id, type = 'normal') {
        this._id = id;
        this._type = type;

        this._isAdded = false;
    }

    get id() { return this._id; }

    get isAdded() { return this._isAdded; }

    addToMenu(options = {}) {
        if (!this._isAdded) {
            options.id = this._id;
            options.type = this._type;

            if (!options.contexts || !options.contexts.length)
                options.contexts = ['all'];

            browser.menus.create(options);

            return this._isAdded = true, this._isAdded;
        }

        return false;
    }

    removeFromMenu() {
        browser.menus.remove(this._id);
    }

    updateVisibility(visible) {
        this.updateItem({
            visible: visible === true
        });
    }

    updateItem(options) {
        browser.menus.update(this._id, options);
    }
}

class SeparatorMenuItem extends BaseMenuItem {
    constructor() {
        const ctrlType = 'separator';
        super(`${ctrlType}_${Date.now()}_${Math.floor(Math.random() * 10000)}`, ctrlType);
    }

    addToMenu() { super.addToMenu(); }
}

class RadioSubMenuItem extends BaseMenuItem {
    constructor(id, parentId, title) {
        super(id, 'radio');

        this._parentId = parentId;
        this._title = title;

        this._isChecked = false;
    }

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

    check() {
        this._updateCheckedState(true);
    }

    _updateCheckedState(checked) {
        if (checked === this._isChecked)
            return;

        this.updateItem({
            checked: this._isChecked = checked
        });
    }
}

class ButtonMenuItem extends BaseMenuItem {
    constructor (id, title, parentId = null) {
        super(id);
    
        this._title = title;
        this._visible = true;

        this._parentId = parentId;
    }

    hide() { return this._setVisibility(false); }

    _setVisibility(isVisible) {
        if (isVisible === this._visible)
            return false;

        this.updateVisibility(this._visible = isVisible);
        return true;
    }

    show() { return this._setVisibility(true); }

    addToMenu(onclick, icon = new MenuIcon()) { this._addToMenu(onclick, icon); }

    _addToMenu(onclick, icon, forSelection = false) { 
        const contexts = [];

        if (forSelection)
            contexts.push('selection');

        super.addToMenu({
            icons : icon ? icon.getSettings() : null,
            parentId: this._parentId,
            onclick,
            contexts,
            title: this._title
        });
    }

    addToSelectionMenu(onclick, icon = new MenuIcon()) { this._addToMenu(onclick, icon, true); }
}

export { SeparatorMenuItem, ButtonMenuItem, RadioSubMenuItem };
