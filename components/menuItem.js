import { MenuIcon } from './menuIcon';

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

    updateVisibility(visible) {
        browser.menus.update(this._id, {
            visible: visible === true
        });
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
    }

    addToMenu(onchange, icon = new MenuIcon(), checked = false) {
        super.addToMenu({
            icons : icon ? icon.getSettings() : [],
            checked,
            parentId: this._parentId,
            title: this._title,
            onclick: onchange
        });
    } 
}

class ButtonMenuItem extends BaseMenuItem {
    constructor (id, title) {
        super(id);
    
        this._title = title;
        this._visible = true;
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
            icons : icon ? icon.getSettings() : [],
            onclick,
            contexts,
            title: this._title
        });
    }

    addToSelectionMenu(onclick, icon = new MenuIcon()) { this._addToMenu(onclick, icon, true); }
}

export { SeparatorMenuItem, ButtonMenuItem, RadioSubMenuItem };
