class BaseMenuItem {
    constructor(id, type = 'normal')
    {
        this.getId = () => id;

        let isAdded = false;
        this.isAdded = () => isAdded;

        this.addToMenu = (options = {}) => {
            if (!isAdded) {
                options.id = id;
                options.type = type;

                if (!options.contexts || !options.contexts.length)
                    options.contexts = ['all'];

                browser.menus.create(options);
    
                return isAdded = true, isAdded;
            }

            return false;
        };

        this.updateVisibility = (visible) =>
            browser.menus.update(id, {
                visible: visible === true
            });
    }
}

class SeparatorMenuItem extends BaseMenuItem {
    constructor () {
        const ctrlType = 'separator';
        super(`${ctrlType}_${Date.now()}`, ctrlType);

        const baseAddToMenu = this.addToMenu;
        this.addToMenu = () => baseAddToMenu();
    }
}

class RadioSubMenuItem extends BaseMenuItem {
    constructor (id, parentId, title)
    {
        super(id, 'radio');

        const baseAddToMenu = this.addToMenu;
        const _addToMenu = (onchange, icons, checked) => { 
            baseAddToMenu({
                title,
                icons,
                parentId,
                checked,
                onclick: onchange,
            });
        };

        this.addToMenu = (onchange, icons = null, checked = false) => _addToMenu(onchange, icons, checked);
    }
;}

class ButtonMenuItem extends BaseMenuItem {
    constructor (id, title) {
        super(id);

        const baseAddToMenu = this.addToMenu;
        const _addToMenu = (onclick, icons, forSelection = false) => { 
            const contexts = [];

            if (forSelection)
                contexts.push('selection');
            
            baseAddToMenu({
                title,
                icons,
                onclick,
                contexts
            });
        };

        this.addToMenu = (onclick, icons = null) => _addToMenu(onclick, icons);

        this.addToSelectionMenu = (onclick, icons = null) => _addToMenu(onclick, icons, true);

        this.hide = () => this.updateVisibility(false);

        this.show = () => this.updateVisibility(true);
    }
}

export { SeparatorMenuItem, ButtonMenuItem, RadioSubMenuItem };
