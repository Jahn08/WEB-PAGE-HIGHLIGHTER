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
        it('should add separator items with distinct ids to a menu', async () => {
            const browserMocked = initMockedBrowser();

            await new SeparatorMenuItem().addToMenu();
            await new SeparatorMenuItem().addToMenu();
            new SeparatorMenuItem();
            
            const separator = new SeparatorMenuItem();
            await separator.addToMenu();
            await separator.addToMenu();

            const insertedOptions = browserMocked.menuOptions;
            assert.strictEqual(insertedOptions.length, 4);

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
        it('should add radiobutton items with options to a menu', async () => {
            const browserMocked = initMockedBrowser();

            const buildRandomRadioItem = () => {
                return { 
                    id: Randomiser.getRandomNumberUpToMax(), 
                    parentId: Randomiser.getRandomNumberUpToMax(), 
                    title: Randomiser.getRandomNumberUpToMax(),
                    icon: new MenuIcon(Randomiser.getRandomNumberUpToMax()),
                    checked: Randomiser.getRandomNumberUpToMax()
                };
            };
            
            const radio1 = buildRandomRadioItem();
            await new RadioSubMenuItem(radio1.id, radio1.parentId, radio1.title).addToMenu(radio1.icon, radio1.checked);
            
            const radio2 = buildRandomRadioItem();
            await new RadioSubMenuItem(radio2.id, radio2.parentId, radio2.title).addToMenu(radio2.icon, radio2.checked);

            const testRadios = [radio1, radio2];
            const radioOptions = browserMocked.menuOptions;

            const radioType = RadioSubMenuItem.TYPE;
            assert(radioOptions.every(o => o.type === radioType));

            assert.strictEqual(radioOptions.length, testRadios.length);

            assert(radioOptions.every(r => testRadios.some(tr => tr.id === r.id && 
                tr.parentId === r.parentId && tr.title === r.title && tr.checked === r.checked &&
                JSON.stringify(tr.icon.getSettings()) === JSON.stringify(r.icons))));
        });
    });
});

describe('components/ButtonMenuItem', () => {
    const buildRandomBtnOptions = (withParent = true) => {
        return { 
            id: Randomiser.getRandomNumberUpToMax(), 
            title: Randomiser.getRandomString(),
            icon: new MenuIcon(Randomiser.getRandomNumberUpToMax()), 
            parentId: (withParent ? Randomiser.getRandomNumberUpToMax(): null)
        };
    };

    const buildBtnWithOptions = async btnOptions => {
        const newBtn = new ButtonMenuItem(btnOptions.id, btnOptions.parentId, btnOptions.title);
        await newBtn.addToMenu(btnOptions.icon);

        return newBtn;
    };

    describe('#addToMenu', () => {
        it('should add button items with options to a menu', () => {
            const browserMocked = initMockedBrowser();

            const testOptions = [buildRandomBtnOptions(), buildRandomBtnOptions(false)];
            testOptions.forEach(async ops => await buildBtnWithOptions(ops));

            const newBtnOptions = browserMocked.menuOptions;

            const btnType = ButtonMenuItem.TYPE;
            assert(newBtnOptions.every(o => o.type === btnType));

            assert(testOptions.every(tr => newBtnOptions.some(r => tr.id === r.id && 
                tr.parentId === r.parentId && tr.title === r.title && 
                JSON.stringify(tr.icon.getSettings()) === JSON.stringify(r.icons))));
        });
    });

    const buildRandomBtn = async () => { 
        const btn = new ButtonMenuItem(Randomiser.getRandomNumberUpToMax(), 
            Randomiser.getRandomNumberUpToMax());
        await btn.addToMenu();

        return btn;
    };

    const buildRandomBtnArray = () => Promise.all([buildRandomBtn(), buildRandomBtn(), buildRandomBtn(), buildRandomBtn()]);

    describe('#updateVisibility', () => {
        it('should update button items visibility in a menu', async () => {
            const browserMocked = initMockedBrowser();

            const buttons = await buildRandomBtnArray();
            buttons.forEach(btn => btn.disable());
            buttons.forEach((btn, index) => {
                if (index % 2)
                    btn.enable();
            });
            
            assert(browserMocked.menuOptions.every(b => b.enabled !== undefined));
        });
    });

    describe('#removeFromMenu', () => {
        it('should remove button items from menu', async () => {
            const browserMocked = initMockedBrowser();

            const residualBtnIds = [];
            (await buildRandomBtnArray()).forEach(async (btn, index) => {
                if (index % 2)
                    await btn.removeFromMenu();
                else
                    residualBtnIds.push(btn.id);
            });
            
            assert.strictEqual(browserMocked.menuOptions.length, residualBtnIds.length);
            assert(browserMocked.menuOptions.every(b => residualBtnIds.includes(b.id)));
        });
    });
    
    describe('#renderShortcut', () => {
        const renderTestShortcut = async btn => {
            const shortcuts = ShortcutPreferencesDOM.createTestShortcuts();
            const randomShortcut = shortcuts[Randomiser.getRandomArrayItem(Object.keys(shortcuts))];

            let updatedTitle;
            btn.updateItem = options => {
                updatedTitle = options.title;
                return Promise.resolve();
            };
            
            await btn.renderShortcut(randomShortcut.key);
            ShortcutPreferencesDOM.assertTitleHasShortcut(updatedTitle, randomShortcut);

            return randomShortcut;
        };
        
        it('should change a shortcut for an emittable button', async () => {
            const btn = await buildBtnWithOptions(buildRandomBtnOptions(true));
            await renderTestShortcut(btn);
            await renderTestShortcut(btn);
        });

        it('should remove a shortcut for an emittable button', async () => {
            const btn = await buildBtnWithOptions(buildRandomBtnOptions(true));
            await renderTestShortcut(btn);

            let updateTitle;
            btn.updateItem = options => { 
                updateTitle = options.title;
                return Promise.resolve();
            };

            await btn.renderShortcut(null);
            ShortcutPreferencesDOM.assertTitleHasNoShortcut(updateTitle);
        });
    });
});
