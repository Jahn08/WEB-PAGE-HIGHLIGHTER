import assert from 'assert';
import { SeparatorMenuItem, ButtonMenuItem, RadioSubMenuItem } from '../../components/menuItem';
import { Randomiser } from '../tools/randomiser';

class BrowserMocked {
    constructor() {
        global.browser = {};
    }

    setBrowserMenu(onMenuCreating, onMenuUpdating) {
        global.browser.menus = {
            create: onMenuCreating,
            update: onMenuUpdating
        };
    }
}

describe('components/SeparatorMenuItem', () => {

    describe('#addToMenu', () => {

        it('should add separator items with distinct ids to menu', () => {
            const ids = [];

            const browserMocked = new BrowserMocked();
            browserMocked.setBrowserMenu(options => {
                assert(options && options.id);
                assert(!ids.includes(options.id), 'A new separator item id is not unique');
                assert.deepStrictEqual(options.type, 'separator');

                ids.push(options.id);
            });

            new SeparatorMenuItem().addToMenu();
            new SeparatorMenuItem().addToMenu();
            new SeparatorMenuItem();
            
            const separator = new SeparatorMenuItem();
            separator.addToMenu();
            separator.addToMenu();

            assert.strictEqual(ids.length, 3);
        });
    });
});

describe('components/RadioSubMenuItem', () => {

    describe('#addToMenu', () => {

        it('should add radiobutton items with options to menu', () => {
            const radioItems = [];

            const browserMocked = new BrowserMocked();
            browserMocked.setBrowserMenu(options => {
                assert(options);
                assert.deepStrictEqual(options.type, 'radio');

                radioItems.push(options);
            });

            const buildRandomRadioItem = () => {
                return { 
                    id: Randomiser.getRandomNumberUpToMax(), 
                    parentId: Randomiser.getRandomNumberUpToMax(), 
                    title: Randomiser.getRandomNumberUpToMax(),
                    onclick: () => {},
                    icons: [],
                    checked: Randomiser.getRandomNumberUpToMax()
                };
            };
            
            const radio1 = buildRandomRadioItem();
            new RadioSubMenuItem(radio1.id, radio1.parentId, radio1.title)
                .addToMenu(radio1.onclick, radio1.icons, radio1.checked);
            
            const radio2 = buildRandomRadioItem();
            new RadioSubMenuItem(radio2.id, radio2.parentId, radio2.title)
                .addToMenu(radio2.onclick, radio2.icons, radio2.checked);

            const testRadios = [radio1, radio2]
            assert.strictEqual(radioItems.length, testRadios.length);
            assert(radioItems.every(r => testRadios.some(tr => tr.id === r.id && 
                tr.parentId === r.parentId && tr.title === r.title && 
                tr.icons === r.icons && tr.onclick === r.onclick && 
                tr.checked === r.checked)));
        });
    });
});

describe('components/ButtonMenuItem', () => {
    const buttons = [];
    const newBtnOptions = [];

    const addingBtnItemMenu = (addingToMenuMethodName) => {
        const browserMocked = new BrowserMocked();
        browserMocked.setBrowserMenu(options => {
            assert(options);
            assert.deepStrictEqual(options.type, 'normal');

            newBtnOptions.push(options);
        });

        const buildRandomBtnItem = () => {
            return { 
                id: Randomiser.getRandomNumberUpToMax(), 
                title: Randomiser.getRandomNumberUpToMax(),
                onclick: () => {},
                icons: []
            };
        };
        
        const getCreatedBtnOptions = () => {
            const btnOptions = buildRandomBtnItem();
            const newBtn = new ButtonMenuItem(btnOptions.id, btnOptions.title);
            buttons.push(newBtn);
            newBtn[addingToMenuMethodName](btnOptions.onclick, btnOptions.icons);

            return btnOptions;
        };

        const testOptions = [getCreatedBtnOptions(), getCreatedBtnOptions()];
        assert(testOptions.every(tr => newBtnOptions.some(r => tr.id === r.id && 
            tr.parentId === r.parentId && tr.title === r.title && 
            tr.onclick === r.onclick && tr.icons === r.icons)));

        return testOptions;
    };

    const ADD_TO_MENU_METHOD_NAME = 'addToMenu';
    describe('#' + ADD_TO_MENU_METHOD_NAME, () => {
        it('should add button items with options to menu', () => addingBtnItemMenu(ADD_TO_MENU_METHOD_NAME));
    });

    const ADD_TO_SELECTION_MENU_METHOD_NAME = 'addToSelectionMenu';
    describe('#' + ADD_TO_SELECTION_MENU_METHOD_NAME, () => {
        it('should add button items with options for selection to menu', () => {
            const createdBtnOptions = addingBtnItemMenu(ADD_TO_SELECTION_MENU_METHOD_NAME);

            const btnOptionsForSelection = newBtnOptions
                .filter(b => b.contexts && b.contexts.includes('selection'));
            assert.deepStrictEqual(btnOptionsForSelection.length, createdBtnOptions.length);
        });
    });

    describe('#updateVisibility', () => {
        it('should update button items visibility in menu', () => {
            const browserMocked = new BrowserMocked();
            browserMocked.setBrowserMenu(null, (id, options) => {
                const foundOptions = newBtnOptions.find(i => i.id === id);
                assert(foundOptions);
    
                Object.assign(foundOptions, options);
            });
    
            buttons.forEach((btn, index) => index % 2 ? btn.hide(): btn.show());
            
            assert(newBtnOptions.every(b => b.visible !== undefined));
        });
    });
});
