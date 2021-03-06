import assert from 'assert';
import { ContextMenu } from '../../components/contextMenu.js';
import { BrowserMocked } from '../tools/browserMocked.js';
import { ShortcutPreferencesDOM } from '../tools/preferencesDOM.js';
import { Randomiser } from '../tools/randomiser.js';
import { ColourList } from '../../components/colourList.js';
import { SeparatorMenuItem, RadioSubMenuItem, ButtonMenuItem } from '../../components/menuItem.js';

describe('components/ContextMenu', () => {
    const mockBrowser = () => {
        const browserMocked = new BrowserMocked();
        browserMocked.setBrowserMenu();
        return browserMocked;
    };
    
    const BTN_TYPE = ButtonMenuItem.TYPE;

    const SEPARATOR_TYPE = SeparatorMenuItem.TYPE;
    
    const RADIO_TYPE = RadioSubMenuItem.TYPE;

    const mockBrowserWithTab = () => {
        const browserMocked = mockBrowser();
        browserMocked.setBrowserTab();

        return browserMocked;
    };

    describe('#constructor', () => {
        it('should create a proper number of items in a context menu', () => {
            const browserMocked = mockBrowser();
            new ContextMenu();

            const itemOptions = browserMocked.menuOptions;
            assert.strictEqual(itemOptions.length, 18);

            assert.strictEqual(itemOptions.filter(i => i.type === SEPARATOR_TYPE).length, 2);

            assert.strictEqual(itemOptions.filter(i => i.type === BTN_TYPE).length, 10);
            
            assert.strictEqual(itemOptions.filter(i => i.type === RADIO_TYPE).length, 6);
        });

        const testClickingOnMenuItem = (menuCallbackNameToTest, filterMenuItemCallback, 
            onClickedCallback = null) => {
            const browserMocked = mockBrowserWithTab();
            const menu = new ContextMenu();

            let error;
            let passedOptions;
            menu[menuCallbackNameToTest] = tabInfo => {
                try {
                    assert(tabInfo.tabId);
                    passedOptions = tabInfo;
                }
                catch (err) {
                    error = err;
                    throw err;
                }
            };
            
            const menuOptions = browserMocked.menuOptions;
            const foundItems = menuOptions.filter(filterMenuItemCallback);
            
            assert(foundItems.length);

            return Promise.all(foundItems.map(async item => {
                assert(item.onclick);
                
                const tabItemInfo = { menuItemId: Randomiser.getRandomNumberUpToMax() };

                passedOptions = null;
                await item.onclick(tabItemInfo);

                if (error)
                    throw error;

                assert(passedOptions);

                if (onClickedCallback)
                    onClickedCallback(tabItemInfo, menu, passedOptions);

                const tabQueries = browserMocked.tabQueries;
                assert.strictEqual(tabQueries.length, foundItems.length);
                assert(tabQueries.every(t => t.active && t.currentWindow));
            }));
        };

        it('should run event callbacks while marking', () =>
            testClickingOnMenuItem('onMarking', i => i.id === 'mark', 
                (menuInfo, menu, options) => assert(options.colourClass)));
        
        it('should run event callbacks while unmarking', () =>
            testClickingOnMenuItem('onUnmarking', i => i.id === 'unmark'));

        it('should run event callbacks and change the marker colour while clicking on menu radio items', () => { 
            const menuColourIds = [];
            const changedColourIds = [];

            return testClickingOnMenuItem('onChangingColour', i => i.type === RADIO_TYPE,
                (menuItemInfo, menu) => {
                    menuColourIds.push(menuItemInfo.menuItemId);
                    changedColourIds.push(menu.currentColourClass);
                }).then(() => assert(changedColourIds.every(cl => menuColourIds.includes(cl))));
        });

        it('should change visibility of button items in a context menu', () => {
            const browserMocked = mockBrowser();
            const contextMenu = new ContextMenu();

            const assertItemsAvailability = (enabled, expectedLength) => {
                assert.strictEqual(browserMocked.menuOptions
                    .filter(i => i.type === BTN_TYPE && i.enabled === enabled).length, expectedLength);
            };
                
            assertItemsAvailability(false, 9);

            contextMenu.enableMarkingBtn();
            contextMenu.enableUnmarkingBtn();
            contextMenu.enableLoadBtn();

            assertItemsAvailability(false, 5);

            contextMenu.enableSaveBtn();
            contextMenu.enableAddingNoteBtn();
            contextMenu.enableRemovingNoteBtn();

            assertItemsAvailability(true, 8);

            contextMenu.disableMarkingBtn();
            contextMenu.disableUnmarkingBtn();
            contextMenu.disableSaveBtn();

            assertItemsAvailability(false, 5);

            contextMenu.disableLoadBtn();
            contextMenu.disableAddingNoteBtn();
            contextMenu.disableRemovingNoteBtn();
            
            assertItemsAvailability(false, 9);
        });
    });

    describe('#checkColourRadio', function () {
        
        it('should make a radio item checked in a context menu', () => {
            const browserMocked = mockBrowser();
            const contextMenu = new ContextMenu();

            const colourInfos = ColourList.colours;
            const expectedColour = Randomiser.getRandomArrayItem(colourInfos);

            contextMenu.checkColourRadio(expectedColour.token);

            const actualColourRadio = browserMocked.menuOptions.find(
                i => i.type === RADIO_TYPE && i.id === expectedColour.token);
            assert(actualColourRadio);
            assert.deepStrictEqual(actualColourRadio.checked, true);
        });

        it('should check only one radio item in a context menu leaving the rest unchecked', () => {
            const browserMocked = mockBrowser();
            const contextMenu = new ContextMenu();

            const colourInfos = ColourList.colours;
            contextMenu.checkColourRadio(colourInfos[0].token);

            const anotherColour = colourInfos[colourInfos.length - 1];
            contextMenu.checkColourRadio(anotherColour.token);

            const checkedItems = browserMocked.menuOptions
                .filter(i => i.type === RADIO_TYPE && i.checked);
            assert.strictEqual(checkedItems.length, 1);
            assert.strictEqual(checkedItems[0].id, anotherColour.token);
        });

        it('should do nothing while checking a non-existent radio item in a context menu', () => {
            const browserMocked = mockBrowser();
            const contextMenu = new ContextMenu();
            
            contextMenu.checkColourRadio(Randomiser.getRandomNumberUpToMax());

            assert.strictEqual(browserMocked.menuOptions.filter(i => i.type === RADIO_TYPE && i.checked).length, 1);
        });
    });
    
    const createRandomNoteLink = () => {
        return {
            id: '' + Randomiser.getRandomNumberUpToMax(),
            text: '' + Randomiser.getRandomNumberUpToMax()
        };
    };

    const testRenderingLinks = (renderingMethodName, createLinksFn, hasAvailableLinksFn) => {
        const browserMocked = mockBrowser();
        const contextMenu = new ContextMenu();

        const expectedLinks = createLinksFn(contextMenu);
        
        contextMenu[renderingMethodName](expectedLinks);
        
        assert(hasAvailableLinksFn(expectedLinks, browserMocked.menuOptions));
    };

    const testRerenderingLinks = (renderingMethodName, createLinksFn, hasAvailableLinksFn) => {
        const browserMocked = mockBrowser();
        const contextMenu = new ContextMenu();

        const linksToRemove = createLinksFn(contextMenu);
        contextMenu[renderingMethodName](linksToRemove);

        const expectedLinks = createLinksFn(contextMenu);
        contextMenu[renderingMethodName](expectedLinks);

        assert(!hasAvailableLinksFn(linksToRemove, browserMocked.menuOptions));
        assert(hasAvailableLinksFn(expectedLinks, browserMocked.menuOptions));
    };

    const assertParentAvailability = (parentId, actualMenuOptions, shouldBeAvailable) => {
        const parentBtn = actualMenuOptions.find(btn => btn.id === parentId);
        assert(parentBtn);

        assert.strictEqual(parentBtn.enabled, shouldBeAvailable);
    };

    const testDisablingParentLinkMenuWhenEmpty = (renderingMethodName, createLinksFn, parentMenuId) => {
        const browserMocked = mockBrowser();

        const contextMenu = new ContextMenu();

        const links = createLinksFn(contextMenu);
        contextMenu[renderingMethodName](links);

        contextMenu[renderingMethodName]([]);
        assertParentAvailability(parentMenuId, browserMocked.menuOptions, false);

        contextMenu[renderingMethodName](links);
        assertParentAvailability(parentMenuId, browserMocked.menuOptions, true);
    };

    const CATEGORY_LINK_RENDERING_METHOD_NAME = 'renderPageCategories';
    describe('#' + CATEGORY_LINK_RENDERING_METHOD_NAME, () => {

        const createTestCategoryTitles = contextMenu => {
            contextMenu.enableSaveBtn();
            return [Randomiser.getRandomString(), Randomiser.getRandomString()];
        };

        const menuHasAvailableCategoryLinks = (expectedLinks, actualMenuOptions) => {
            const actualNoteLinkBtns = actualMenuOptions.filter(i => i.type === BTN_TYPE && 
                expectedLinks.find(el => i.title.endsWith(el)));
            const actualBtnIds = new Set(actualNoteLinkBtns.map(i => i.id));

            if (actualNoteLinkBtns.length !== expectedLinks.length || 
                actualBtnIds.size !== expectedLinks.length)
                return false;
    
            const parentId = actualNoteLinkBtns[0].parentId;
            
            const parentBtn = actualMenuOptions.find(btn => btn.id === parentId);
            
            if (!parentBtn || !parentBtn.enabled)
                return false;
    
            if (!actualNoteLinkBtns.every(btn => btn.parentId === parentId) || 
                !actualNoteLinkBtns.every(btn => expectedLinks.find(categoryTitle => btn.id && 
                    btn.title.endsWith(categoryTitle))))
                return false;
    
            return actualMenuOptions.filter(
                i => i.type === BTN_TYPE && i.id === parentId).length === 1;
        };

        it('should render categories for saving in menu', 
            () => testRenderingLinks(CATEGORY_LINK_RENDERING_METHOD_NAME, createTestCategoryTitles, 
                menuHasAvailableCategoryLinks));

        it('should remove all previous categories in menu while rendering afresh', 
            () => testRerenderingLinks(CATEGORY_LINK_RENDERING_METHOD_NAME, createTestCategoryTitles,
                menuHasAvailableCategoryLinks));

        const SAVING_SUB_MENU_ID = 'save-to';
        it('should disable the category submenu when rendering the empty list and enable it otherwise', 
            () => testDisablingParentLinkMenuWhenEmpty(CATEGORY_LINK_RENDERING_METHOD_NAME, 
                createTestCategoryTitles, SAVING_SUB_MENU_ID));
        
        it('should disable the category submenu if the save menu is not available', () => {
            const browserMocked = mockBrowser();

            const contextMenu = new ContextMenu();

            const noteLinks = createTestCategoryTitles(contextMenu);
            contextMenu.renderPageCategories(noteLinks);

            assertParentAvailability(SAVING_SUB_MENU_ID, browserMocked.menuOptions, true);

            contextMenu.disableSaveBtn();
            assertParentAvailability(SAVING_SUB_MENU_ID, browserMocked.menuOptions, false);
        });

        const NONE_CATEGORY_NAME = 'None';
        it('should render the none category available for saving only when there are other categories',
            () => {
                const browserMocked = mockBrowser();

                const contextMenu = new ContextMenu();
                const categoryLinks = createTestCategoryTitles(contextMenu);

                contextMenu.renderPageCategories(categoryLinks);
                assert(menuHasAvailableCategoryLinks([NONE_CATEGORY_NAME], browserMocked.menuOptions));
                
                contextMenu.renderPageCategories([]);
                assert(!menuHasAvailableCategoryLinks([NONE_CATEGORY_NAME], browserMocked.menuOptions));
            });

        const assureDefaultCategory = (actualOptions, expectedDefaultCategory) => {
            const actualNoneCategory = actualOptions
                .find(op => op.title.endsWith(expectedDefaultCategory));
            assert(actualNoneCategory);
            assert.notStrictEqual(actualNoneCategory, expectedDefaultCategory);
        };

        it('should mark a menu item for saving to the none category when there is no default category',
            () => {
                const browserMocked = mockBrowser();

                const contextMenu = new ContextMenu();
                const categoryLinks = createTestCategoryTitles(contextMenu);

                contextMenu.renderPageCategories(categoryLinks);
                assureDefaultCategory(browserMocked.menuOptions, NONE_CATEGORY_NAME);
            });

        it('should mark a menu item for saving to a default category with a conspicuous prefix',
            () => {
                const browserMocked = mockBrowser();

                const contextMenu = new ContextMenu();
                const categoryLinks = createTestCategoryTitles(contextMenu);

                const expectedDefaultCategory = Randomiser.getRandomArrayItem(categoryLinks);
                contextMenu.renderPageCategories(categoryLinks, expectedDefaultCategory);
                
                assureDefaultCategory(browserMocked.menuOptions, expectedDefaultCategory);
            });
        
        it('should return an original title of a default category when clicking', () => {
            const browserMocked = mockBrowserWithTab();

            const contextMenu = new ContextMenu();
            const categoryLinks = createTestCategoryTitles(contextMenu);

            const expectedDefaultCategory = Randomiser.getRandomArrayItem(categoryLinks);
            
            return new Promise((resolve, reject) => {
                contextMenu.onSaving = info => {
                    if (info.categoryTitle === expectedDefaultCategory)
                        resolve();
                    else
                        reject(new Error(`'${info.categoryTitle}' !== '${expectedDefaultCategory}'`));
                };

                contextMenu.renderPageCategories(categoryLinks, expectedDefaultCategory);
    
                const defaultCategoryMenu = browserMocked.menuOptions
                    .find(op => op.title.endsWith(expectedDefaultCategory));
    
                browserMocked.dispatchMenuClick(defaultCategoryMenu.id);
            });
        });
    });

    const menuHasAvailableNoteLinks = (expectedNoteLinks, actualMenuOptions) => {
        const expectedNoteLinkIds = expectedNoteLinks.map(l => l.id);
        const actualNoteLinkBtns = actualMenuOptions.filter(i => i.type === BTN_TYPE && 
            expectedNoteLinkIds.includes(i.id));
        
        if (actualNoteLinkBtns.length !== expectedNoteLinks.length)
            return false;

        const parentId = actualNoteLinkBtns[0].parentId;
        
        const parentBtn = actualMenuOptions.find(btn => btn.id === parentId);
        
        if (!parentBtn || !parentBtn.enabled)
            return false;

        if (!actualNoteLinkBtns.every(btn => btn.parentId === parentId) || 
            !actualNoteLinkBtns.every(btn => expectedNoteLinks.find(li => btn.id === li.id && 
                btn.title === li.text)))
            return false;

        return actualMenuOptions.filter(i => i.type === BTN_TYPE && i.id === parentId).length === 1;
    };

    const NOTE_LINK_RENDERING_METHOD_NAME = 'renderNoteLinks';
    describe('#' + NOTE_LINK_RENDERING_METHOD_NAME, () => {

        const createTestNoteLinks = () => [createRandomNoteLink(), createRandomNoteLink()];

        it('should render note links in menu', 
            () => testRenderingLinks(NOTE_LINK_RENDERING_METHOD_NAME, createTestNoteLinks, 
                menuHasAvailableNoteLinks));

        it('should remove all previous note links in menu while rendering afresh', 
            () => testRerenderingLinks(NOTE_LINK_RENDERING_METHOD_NAME, createTestNoteLinks, 
                menuHasAvailableNoteLinks));

        it('should disable the navigational note submenu when rendering an empty list of notes and enable it otherwise', 
            () => testDisablingParentLinkMenuWhenEmpty(NOTE_LINK_RENDERING_METHOD_NAME, 
                createTestNoteLinks, 'note-navigation'));
    });

    describe('#appendNoteLink', () => {

        it('should append a note link to menu', () => {
            const browserMocked = mockBrowser();
            const contextMenu = new ContextMenu();

            const expectedNoteLink = createRandomNoteLink();
            contextMenu.appendNoteLink(expectedNoteLink.id, expectedNoteLink.text);
            
            assert(menuHasAvailableNoteLinks([expectedNoteLink], browserMocked.menuOptions));
        });
    });
    
    describe('#removeNoteLink', () => {

        it('should remove a note link from menu', () => {
            const browserMocked = mockBrowser();
            const contextMenu = new ContextMenu();

            const expectedNoteLinks = [createRandomNoteLink(), createRandomNoteLink(), 
                createRandomNoteLink()];
            contextMenu.renderNoteLinks(expectedNoteLinks);
            
            const noteLinkToRemove = expectedNoteLinks[0];
            contextMenu.removeNoteLink(noteLinkToRemove.id);

            assert(!menuHasAvailableNoteLinks([noteLinkToRemove], browserMocked.menuOptions));
            assert(menuHasAvailableNoteLinks(expectedNoteLinks.filter(li => li.id !== noteLinkToRemove.id), 
                browserMocked.menuOptions));
        });
    });

    describe('#emitItemClick', () => {

        it('should emit a click for some enabled button menu items', () => {
            mockBrowserWithTab();
            const contextMenu = new ContextMenu();
            contextMenu.enableAddingNoteBtn();
            contextMenu.enableMarkingBtn();

            return new Promise((resolve, reject) => {
                let markingClicked = false;
                contextMenu.onMarking = () => markingClicked = true;
                contextMenu.emitItemClick(OptionList.marking.mark);

                contextMenu.onAddingNote = () => {
                    if (markingClicked)
                        resolve();
                    else
                        reject(new Error('The marking event has not been emitted'));
                };
                contextMenu.emitItemClick(OptionList.noting.add);
            });
        });

        it('should not emit a click for a disabled button menu item', () => {
            mockBrowserWithTab();
            const contextMenu = new ContextMenu();
            contextMenu.enableAddingNoteBtn();
            contextMenu.disableMarkingBtn();

            return new Promise((resolve, reject) => {
                let markingClicked = false;
                contextMenu.onMarking = () => markingClicked = true;
                contextMenu.emitItemClick(OptionList.marking.mark);

                contextMenu.onAddingNote = () => {
                    if (markingClicked)
                        reject(new Error('The marking event should\'t have been emitted'));
                    else
                        resolve();
                };
                contextMenu.emitItemClick(OptionList.noting.add);
            });
        });

        it('should not emit a click for a non-emittable button menu item', () => {
            mockBrowserWithTab();
            const contextMenu = new ContextMenu();
            contextMenu.enableAddingNoteBtn();

            return new Promise((resolve, reject) => {
                let changeColourClicked = false;
                contextMenu.onChangingColour = () => changeColourClicked = true;
                contextMenu.emitItemClick(OptionList.marking.setColour);

                contextMenu.onAddingNote = () => {
                    if (changeColourClicked)
                        reject(new Error('The marking event should\'t have been emitted'));
                    else
                        resolve();
                };
                contextMenu.emitItemClick(OptionList.noting.add);
            });
        });
    });
    
    describe('#renderShortcuts', function () {
        
        const renderTestShortcuts = (contextMenu = new ContextMenu()) => {
            const shortcuts = ShortcutPreferencesDOM.createTestShortcuts();
            contextMenu.renderShortcuts(shortcuts);

            return shortcuts;
        };

        it('should render shortcuts for some emittable buttons', () => {
            const browserMocked = mockBrowserWithTab();
            const shortcuts = renderTestShortcuts();

            browserMocked.menuOptions.forEach(op => {
                if (op.type !== BTN_TYPE)
                    return;

                const shortcut = shortcuts[op.id];

                if (shortcut)
                    ShortcutPreferencesDOM.assertTitleHasShortcut(op.title, shortcut);
                else
                    ShortcutPreferencesDOM.assertTitleHasNoShortcut(op.title);
            });
        });
        
        it('should change a shortcut for an emittable button', () => {
            const browserMocked = mockBrowserWithTab();
            const contextMenu = new ContextMenu();
            const shortcuts = renderTestShortcuts(contextMenu);

            const cmdIds = Object.keys(shortcuts);
            const firstCmdId = cmdIds[0];
            shortcuts[firstCmdId].key = shortcuts[cmdIds[cmdIds.length - 1]].key;

            contextMenu.renderShortcuts(shortcuts);
            const btn = browserMocked.menuOptions.find(op => op.id === firstCmdId);
            assert(btn.title.endsWith(`(${shortcuts[firstCmdId].key})`));
        });

        it('should remove a shortcut for some emittable buttons without emptying the others', () => {
            const browserMocked = mockBrowserWithTab();
            const contextMenu = new ContextMenu();
            const shortcuts = renderTestShortcuts(contextMenu);

            const cmdIds = Object.keys(shortcuts);
            const firstCmdId = cmdIds[0];
            shortcuts[firstCmdId].key = null;
            
            const lastCmdId = cmdIds[cmdIds.length - 1];
            shortcuts[lastCmdId] = null;

            contextMenu.renderShortcuts(shortcuts);
            browserMocked.menuOptions.forEach(op => {
                let shortcut;

                if (op.id === firstCmdId || op.id === lastCmdId)
                    ShortcutPreferencesDOM.assertTitleHasNoShortcut(op.title);
                else if ((shortcut = shortcuts[op.id]))
                    ShortcutPreferencesDOM.assertTitleHasShortcut(op.title, shortcut);
            });
        });

        it('should remove shortcuts for emittable buttons when there are none provided', () => {
            const browserMocked = mockBrowserWithTab();
            const contextMenu = new ContextMenu();
            renderTestShortcuts(contextMenu);

            contextMenu.renderShortcuts();
            browserMocked.menuOptions.forEach(op => {
                if (op.type === BTN_TYPE)
                    ShortcutPreferencesDOM.assertTitleHasNoShortcut(op.title);
            });
        });
    });
});
