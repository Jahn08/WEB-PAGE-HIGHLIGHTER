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

    addToMenu(onchange, icons = null, checked = false) {
        super.addToMenu({
            icons,
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
    }

    hide() { this.updateVisibility(false); }

    show() { this.updateVisibility(true); }

    addToMenu(onclick, icons = null) { this._addToMenu(onclick, icons); }

    _addToMenu(onclick, icons, forSelection = false) { 
        const contexts = [];

        if (forSelection)
            contexts.push('selection');

        super.addToMenu({
            icons,
            onclick,
            contexts,
            title: this._title
        });
    }

    addToSelectionMenu(onclick, icons = null) { this._addToMenu(onclick, icons, true); }
}

export { SeparatorMenuItem, ButtonMenuItem, RadioSubMenuItem };
