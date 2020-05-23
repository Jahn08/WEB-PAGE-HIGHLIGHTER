import assert from 'assert';
import { SeparatorMenuItem, ButtonMenuItem, RadioSubMenuItem } from '../../components/menuItem.js';
import { Randomiser } from '../tools/randomiser.js';
import { ShortcutPreferencesDOM } from '../tools/preferencesDOM.js';
import { BrowserMocked } from '../tools/browserMocked.js';
import { MenuIcon } from '../../components/menuIcon.js';

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

    const buildRandomBtnOptions = (withParent = true, onclickFn = null) => {
        return { 
            id: Randomiser.getRandomNumberUpToMax(), 
            title: Randomiser.getRandomString(),
            onclick: (onclickFn ? onclickFn: () => {}),
            icon: new MenuIcon(Randomiser.getRandomNumberUpToMax()), 
            parentId: (withParent ? Randomiser.getRandomNumberUpToMax(): null)
        };
    };

    const buildBtnWithOptions = btnOptions => {
        const newBtn = new ButtonMenuItem(btnOptions.id, btnOptions.parentId, btnOptions.title);
        newBtn.addToMenu(btnOptions.onclick, btnOptions.icon);

        return newBtn;
    };

    describe('#addToMenu', () => {

        it('should add button items with options to a menu', () => {
            const browserMocked = initMockedBrowser();

            const testOptions = [buildRandomBtnOptions(), buildRandomBtnOptions(false)];
            testOptions.forEach(ops => buildBtnWithOptions(ops));

            const newBtnOptions = browserMocked.menuOptions;

            const btnType = ButtonMenuItem.TYPE;
            assert(newBtnOptions.every(o => o.type === btnType));

            assert(testOptions.every(tr => newBtnOptions.some(r => tr.id === r.id && 
                tr.parentId === r.parentId && tr.title === r.title && 
                JSON.stringify(tr.icon.getSettings()) === JSON.stringify(r.icons))));
        });

        it('should add a button menu with a callback returning its title', () => {
            const browserMocked = initMockedBrowser();

            let title;
            const testOptions = buildRandomBtnOptions(false, 
                info => {
                    title = info.title;
                });

            const btn = buildBtnWithOptions(testOptions);
            browserMocked.dispatchMenuClick(btn.id);

            assert.strictEqual(title, testOptions.title);
        });
    });

    const buildRandomBtn = () => { 
        const btn = new ButtonMenuItem(Randomiser.getRandomNumberUpToMax(), 
            Randomiser.getRandomNumberUpToMax());
        btn.addToMenu();

        return btn;
    };

    const buildRandomBtnArray = () => [buildRandomBtn(), buildRandomBtn(), 
        buildRandomBtn(), buildRandomBtn()];

    describe('#updateVisibility', () => {
        it('should update button items visibility in a menu', () => {
            const browserMocked = initMockedBrowser();

            const buttons = buildRandomBtnArray();
            buttons.forEach(btn => btn.disable());
            buttons.forEach((btn, index) => {
                if (index % 2)
                    btn.enable();
            });
            
            assert(browserMocked.menuOptions.every(b => b.enabled !== undefined));
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

    describe('#emitClick', () => {

        it('should emit a click for an enabled button item', () => {
            let isClicked = false;
            const btn = buildBtnWithOptions(buildRandomBtnOptions(true, () => isClicked = true));
            btn.enable();
            assert(btn.isEnabled);

            btn.emitClick();
            assert(isClicked);
        });
        
        it('should not emit a click for a disabled button item', () => {
            let isClicked = false;
            const btn = buildBtnWithOptions(buildRandomBtnOptions(true, () => isClicked = true));
            btn.disable();
            assert(!btn.isEnabled);

            btn.emitClick();
            assert(!isClicked);
        });
    });
    
    describe('#renderShortcut', () => {

        const renderTestShortcut = btn => {
            const shortcuts = ShortcutPreferencesDOM.createTestShortcuts();
            
            const randomShortcut = shortcuts[Randomiser.getRandomArrayItem(
                Object.keys(shortcuts))];

            btn.updateItem = options => ShortcutPreferencesDOM.assertTitleHasShortcut(
                options.title, randomShortcut);
            assert(btn.renderShortcut(randomShortcut.key));

            return randomShortcut;
        };
        
        it('should change a shortcut for an emittable button', () => {
            const btn = buildBtnWithOptions(buildRandomBtnOptions(true));
            renderTestShortcut(btn);
            renderTestShortcut(btn);
        });

        it('should remove a shortcut for an emittable button', () => {
            const btn = buildBtnWithOptions(buildRandomBtnOptions(true));
            renderTestShortcut(btn);

            btn.updateItem = options => ShortcutPreferencesDOM.assertTitleHasNoShortcut(
                options.title);
            assert(btn.renderShortcut(null));
        });
        
        it('should not render the same shortcut for an emittable button', () => {
            const btn = buildBtnWithOptions(buildRandomBtnOptions(true));
            const rendereShortcut = renderTestShortcut(btn);
            assert(!btn.renderShortcut(rendereShortcut.key));
        });
    });
});
