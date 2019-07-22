import assert from 'assert';
import { SeparatorMenuItem, ButtonMenuItem, RadioSubMenuItem } from '../../components/menuItem.js';
import { Randomiser } from '../tools/randomiser';
import { BrowserMocked } from '../tools/browserMocked';
import { MenuIcon } from '../../components/menuIcon';

const initMockedBrowser = () => {
    const browserMocked = new BrowserMocked();
    browserMocked.setBrowserMenu();

    return browserMocked;
};

describe('components/SeparatorMenuItem', () => {
    describe('#addToMenu', () => {
        it('should add separator items with distinct ids to a menu', () => {
            const browserMocked = initMockedBrowser();

            new SeparatorMenuItem().addToMenu();
            new SeparatorMenuItem().addToMenu();
            new SeparatorMenuItem();
            
            const separator = new SeparatorMenuItem();
            separator.addToMenu();
            separator.addToMenu();

            const insertedOptions = browserMocked.menuOptions;
            assert.strictEqual(insertedOptions.length, 3);

            const separatorType = SeparatorMenuItem.TYPE;
            assert(insertedOptions.every(o => o.type === separatorType));

            let equalIds = 0;
            insertedOptions.sort((a, b) => a > b ? a: b)
                .reduce((p, c) => { 
                    if (p === c)
                        ++equalIds;

                    return c;
                });
            assert.strictEqual(equalIds, 0);
        });
    });
});

describe('components/RadioSubMenuItem', () => {
    describe('#addToMenu', () => {
        it('should add radiobutton items with options to a menu', () => {
            const browserMocked = initMockedBrowser();

            const buildRandomRadioItem = () => {
                return { 
                    id: Randomiser.getRandomNumberUpToMax(), 
                    parentId: Randomiser.getRandomNumberUpToMax(), 
                    title: Randomiser.getRandomNumberUpToMax(),
                    onclick: () => {},
                    icon: new MenuIcon(Randomiser.getRandomNumberUpToMax()),
                    checked: Randomiser.getRandomNumberUpToMax()
                };
            };
            
            const radio1 = buildRandomRadioItem();
            new RadioSubMenuItem(radio1.id, radio1.parentId, radio1.title)
                .addToMenu(radio1.onclick, radio1.icon, radio1.checked);
            
            const radio2 = buildRandomRadioItem();
            new RadioSubMenuItem(radio2.id, radio2.parentId, radio2.title)
                .addToMenu(radio2.onclick, radio2.icon, radio2.checked);

            const testRadios = [radio1, radio2];
            const radioOptions = browserMocked.menuOptions;

            const radioType = RadioSubMenuItem.TYPE;
            assert(radioOptions.every(o => o.type === radioType));

            assert.strictEqual(radioOptions.length, testRadios.length);

            assert(radioOptions.every(r => testRadios.some(tr => tr.id === r.id && 
                tr.parentId === r.parentId && tr.title === r.title && 
                JSON.stringify(tr.icon.getSettings()) === JSON.stringify(r.icons) && 
                tr.onclick === r.onclick && tr.checked === r.checked)));
        });
    });
});

describe('components/ButtonMenuItem', () => {
    const addingBtnItemMenu = (addingToMenuMethodName) => {
        const browserMocked = initMockedBrowser();

        const buildRandomBtnOptions = () => {
            return { 
                id: Randomiser.getRandomNumberUpToMax(), 
                title: Randomiser.getRandomNumberUpToMax(),
                onclick: () => {},
                icon: new MenuIcon(Randomiser.getRandomNumberUpToMax()), 
                parentId: Randomiser.getRandomNumberUpToMax()
            };
        };

        const buttons = [];

        const getCreatedBtnOptions = (withParent = true) => {
            const btnOptions = buildRandomBtnOptions();

            if (!withParent)
                btnOptions.parentId = null;

            const newBtn = new ButtonMenuItem(btnOptions.id, btnOptions.title, btnOptions.parentId);
            buttons.push(newBtn);
            newBtn[addingToMenuMethodName](btnOptions.onclick, btnOptions.icon);

            return btnOptions;
        };
        
        const testOptions = [getCreatedBtnOptions(), getCreatedBtnOptions(false)];

        const newBtnOptions = browserMocked.menuOptions;

        const btnType = ButtonMenuItem.TYPE;
        assert(newBtnOptions.every(o => o.type === btnType));

        assert(testOptions.every(tr => newBtnOptions.some(r => tr.id === r.id && 
            tr.parentId === r.parentId && tr.title === r.title && 
            tr.onclick === r.onclick &&
            JSON.stringify(tr.icon.getSettings()) === JSON.stringify(r.icons))));

        return newBtnOptions;
    };

    const ADD_TO_MENU_METHOD_NAME = 'addToMenu';
    describe('#' + ADD_TO_MENU_METHOD_NAME, () => {
        it('should add button items with options to a menu', () => addingBtnItemMenu(ADD_TO_MENU_METHOD_NAME));
    });

    const ADD_TO_SELECTION_MENU_METHOD_NAME = 'addToSelectionMenu';
    describe('#' + ADD_TO_SELECTION_MENU_METHOD_NAME, () => {
        it('should add button items with options for selection to a menu', () => {
            assert(addingBtnItemMenu(ADD_TO_SELECTION_MENU_METHOD_NAME)
                .every(b => b.contexts && b.contexts.includes('selection')));
        });
    });

    const buildRandomBtn = () => { 
        const btn = new ButtonMenuItem(Randomiser.getRandomNumberUpToMax(), Randomiser.getRandomNumberUpToMax());
        btn.addToMenu();

        return btn;
    };

    const buildRandomBtnArray = () => [buildRandomBtn(), buildRandomBtn(), buildRandomBtn(), buildRandomBtn()];

    describe('#updateVisibility', () => {
        it('should update button items visibility in a menu', () => {
            const browserMocked = initMockedBrowser();

            const buttons = buildRandomBtnArray();
            buttons.forEach(btn => btn.hide());
            buttons.forEach((btn, index) => {
                if (index % 2)
                    btn.show();
            });
            
            assert(browserMocked.menuOptions.every(b => b.visible !== undefined));
        });
    });

    describe('#removeFromMenu', () => {

        it('should remove button items from menu', () => {
            const browserMocked = initMockedBrowser();

            const residualBtnIds = [];
            buildRandomBtnArray().forEach((btn, index) => {
                if (index % 2)
                    btn.removeFromMenu();
                else
                    residualBtnIds.push(btn.id);
            });
            
            assert.strictEqual(browserMocked.menuOptions.length, residualBtnIds.length);
            assert(browserMocked.menuOptions.every(b => residualBtnIds.includes(b.id)));
        });
    });
});
