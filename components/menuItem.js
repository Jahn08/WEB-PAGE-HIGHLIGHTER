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

class ButtonMenuItem extends BaseMenuItem {
    constructor (id, title) {
        super(id);

        const baseAddToMenu = this.addToMenu;
        const _addToMenu = (onclick, icons, forSelection = false) => { 
            const contexts = ['selection'];
            
            if (!forSelection)
                contexts.push('all');

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

export { SeparatorMenuItem, ButtonMenuItem };
