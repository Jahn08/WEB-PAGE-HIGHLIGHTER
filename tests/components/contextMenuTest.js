import assert from 'assert';
import { ContextMenu } from '../../components/contextMenu.js';
import { OptionList } from '../../content_scripts/menuMessageEvent.js';
import { BrowserMocked } from '../tools/browserMocked.js';
import { ShortcutPreferencesDOM } from '../tools/preferencesDOM.js';
import { Randomiser } from '../tools/randomiser.js';
import { ColourList } from '../../components/colourList.js';
import { SeparatorMenuItem, RadioSubMenuItem, ButtonMenuItem } from '../../components/menuItem.js';
import { MessageSender } from '../../components/messageSender.js';
import { Expectation } from '../tools/expectation.js';

describe('components/ContextMenu', () => {
    const msgSenderPropMap = new Map();

    before(() => {
        Object.getOwnPropertyNames(MessageSender)
            .filter(pn => { 
                return pn.startsWith('send');
            })
            .forEach(pn => {
                msgSenderPropMap[pn] = MessageSender[pn]; 
            });
    });
    
    let msgSenderChangedPropName = null;
    
    afterEach('resetMessageSender', () => {        
        if(msgSenderChangedPropName) {
            MessageSender[msgSenderChangedPropName] = msgSenderPropMap[msgSenderChangedPropName];
            msgSenderChangedPropName = null;
        }
    });

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
        browserMocked.setBrowserMenu();

        return browserMocked;
    };

    const renderContextMenu = async () => {
        const menu = new ContextMenu();
        await menu.render();

        return menu;
    };

    describe('#constructor', function () {
        it('should create a clickable instance', async () => {
            const browserMocked = mockBrowserWithTab();
            new ContextMenu();

            const menuCallbackNameToTest = 'sendMarking';
            msgSenderChangedPropName = menuCallbackNameToTest;

            let menuInfo = null;
            MessageSender[menuCallbackNameToTest] = info => {
                menuInfo = info;
            };

            await browserMocked.dispatchMenuClick('mark');
            
            assert.notStrictEqual(menuInfo, null);
        });
    });

    describe('#render', function () {
        it('should create a proper number of items in a context menu', async () => {
            const browserMocked = mockBrowser();
            await renderContextMenu();

            const itemOptions = browserMocked.menuOptions;
            assert.strictEqual(itemOptions.length, 18);

            assert.strictEqual(itemOptions.filter(i => i.type === SEPARATOR_TYPE).length, 2);

            assert.strictEqual(itemOptions.filter(i => i.type === BTN_TYPE).length, 10);
            
            assert.strictEqual(itemOptions.filter(i => i.type === RADIO_TYPE).length, 6);
        });

        const testClickingOnMenuItem = async (menuCallbackNameToTest, filterMenuItemCallback, onClickedCallback = null) => {
            const browserMocked = mockBrowserWithTab();
            await renderContextMenu();

            let error;
            const passedOptions = [];

            msgSenderChangedPropName = menuCallbackNameToTest;
            MessageSender[menuCallbackNameToTest] = tabInfo => {
                try {
                    assert(tabInfo.tabId);
                    passedOptions.push(tabInfo);
                } catch (err) {
                    error = err;
                    throw err;
                }
            };

            const menuOptions = browserMocked.menuOptions;
            const foundItems = menuOptions.filter(filterMenuItemCallback);
            
            assert(foundItems.length);

            return Promise.all(foundItems.map(async item => {
                await browserMocked.dispatchMenuClick(item.id);

                if (error)
                    throw error;

                if (onClickedCallback)
                    onClickedCallback(item.id);

                const tabQueries = browserMocked.tabQueries;
                assert.strictEqual(tabQueries.length, foundItems.length);
                assert(tabQueries.every(t => t.active && t.currentWindow));
            })).then(() => passedOptions);
        };

        it('should run event callbacks while marking', () => testClickingOnMenuItem('sendMarking', i => i.id === 'mark'));
        
        it('should run event callbacks while unmarking', () => testClickingOnMenuItem('sendUnmarking', i => i.id === 'unmark'));

        it('should run event callbacks and change the marker colour while clicking on menu radio items', () => { 
            const menuColourIds = [];

            return testClickingOnMenuItem('sendChangingColour', i => i.type === RADIO_TYPE, menuItemId => menuColourIds.push(menuItemId))
                .then(passedOptions => assert(passedOptions.map(po => po.colourClass).every(cl => menuColourIds.includes(cl))));
        });

        it('should change visibility of button items in a context menu', async () => {
            const browserMocked = mockBrowser();
            const contextMenu = await renderContextMenu();

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
            
            assertItemsAvailability(false, 8);
        });
    });

    describe('#checkColourRadio', function () {
        it('should make a radio item checked in a context menu', async () => {
            const browserMocked = mockBrowser();
            const contextMenu = await renderContextMenu();

            const colourInfos = ColourList.colours;
            const expectedColour = Randomiser.getRandomArrayItem(colourInfos);

            await contextMenu.checkColourRadio(expectedColour.token);

            const actualColourRadio = browserMocked.menuOptions.find(
                i => i.type === RADIO_TYPE && i.id === expectedColour.token);
            assert(actualColourRadio);
            assert.deepStrictEqual(actualColourRadio.checked, true);
        });

        it('should do nothing while checking a non-existent radio item in a context menu', async () => {
            const browserMocked = mockBrowser();
            const contextMenu = await renderContextMenu();
            
            await contextMenu.checkColourRadio(Randomiser.getRandomNumberUpToMax());

            assert.strictEqual(browserMocked.menuOptions.filter(i => i.type === RADIO_TYPE && i.checked).length, 1);
        });
    });
    
    const createRandomNoteLink = () => {
        return {
            id: '' + Randomiser.getRandomNumberUpToMax(),
            text: '' + Randomiser.getRandomNumberUpToMax()
        };
    };

    const testRenderingLinks = async (renderingMethodName, createLinksFn, hasAvailableLinksFn) => {
        const browserMocked = mockBrowser();
        const contextMenu = await renderContextMenu();

        const expectedLinks = createLinksFn(contextMenu);
        
        await contextMenu[renderingMethodName](expectedLinks);
        
        assert(hasAvailableLinksFn(expectedLinks, browserMocked.menuOptions));
    };

    const testRerenderingLinks = async (renderingMethodName, createLinksFn, hasAvailableLinksFn) => {
        const browserMocked = mockBrowser();
        const contextMenu = await renderContextMenu();

        const linksToRemove = createLinksFn(contextMenu);
        await contextMenu[renderingMethodName](linksToRemove);

        const expectedLinks = createLinksFn(contextMenu);
        await contextMenu[renderingMethodName](expectedLinks);

        assert(!hasAvailableLinksFn(linksToRemove, browserMocked.menuOptions));
        assert(hasAvailableLinksFn(expectedLinks, browserMocked.menuOptions));
    };

    const assertParentAvailability = (parentId, actualMenuOptions, shouldBeAvailable) => {
        const parentBtn = actualMenuOptions.find(btn => btn.id === parentId);
        assert(parentBtn);

        assert.strictEqual(parentBtn.enabled, shouldBeAvailable);
    };

    const testDisablingParentLinkMenuWhenEmpty = async (renderingMethodName, createLinksFn, parentMenuId) => {
        const browserMocked = mockBrowser();
        const contextMenu = await renderContextMenu();

        const links = createLinksFn(contextMenu);
        await contextMenu[renderingMethodName](links);

        await contextMenu[renderingMethodName]([]);
        assertParentAvailability(parentMenuId, browserMocked.menuOptions, false);

        await contextMenu[renderingMethodName](links);
        assertParentAvailability(parentMenuId, browserMocked.menuOptions, true);
    };

    describe('#renderPageCategories', () => {
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

        const CATEGORY_LINK_RENDERING_METHOD_NAME = 'renderPageCategories';

        it('should render categories for saving in menu', 
            () => testRenderingLinks(CATEGORY_LINK_RENDERING_METHOD_NAME, createTestCategoryTitles, menuHasAvailableCategoryLinks));

        it('should remove all previous categories in menu while rendering afresh', 
            () => testRerenderingLinks(CATEGORY_LINK_RENDERING_METHOD_NAME, createTestCategoryTitles, menuHasAvailableCategoryLinks));

        const SAVING_SUB_MENU_ID = 'save-to';
        it('should disable the category submenu when rendering the empty list and enable it otherwise', 
            () => testDisablingParentLinkMenuWhenEmpty(CATEGORY_LINK_RENDERING_METHOD_NAME, createTestCategoryTitles, SAVING_SUB_MENU_ID));
        
        it('should disable the category submenu if the save menu is not available', async () => {
            const browserMocked = mockBrowser();
            const contextMenu = await renderContextMenu();

            const noteLinks = createTestCategoryTitles(contextMenu);
            await contextMenu.renderPageCategories(noteLinks);

            assertParentAvailability(SAVING_SUB_MENU_ID, browserMocked.menuOptions, true);

            contextMenu.disableSaveBtn();
            assertParentAvailability(SAVING_SUB_MENU_ID, browserMocked.menuOptions, false);
        });

        const NONE_CATEGORY_NAME = 'None';
        it('should render the none category available for saving only when there are other categories', async () => {
            const browserMocked = mockBrowser();
            const contextMenu = await renderContextMenu();
            const categoryLinks = createTestCategoryTitles(contextMenu);

            await contextMenu.renderPageCategories(categoryLinks);
            assert(menuHasAvailableCategoryLinks([NONE_CATEGORY_NAME], browserMocked.menuOptions));
            
            await contextMenu.renderPageCategories([]);
            assert(!menuHasAvailableCategoryLinks([NONE_CATEGORY_NAME], browserMocked.menuOptions));
        });

        const assureDefaultCategory = (actualOptions, expectedDefaultCategory) => {
            const actualNoneCategories = actualOptions.filter(op => op.title.endsWith(expectedDefaultCategory));
            assert.equal(actualNoneCategories.length, 1);
            assert.notStrictEqual(actualNoneCategories[0], expectedDefaultCategory);
        };

        it('should mark a menu item for saving to the none category when there is no default category', async () => {
            const browserMocked = mockBrowser();
            const contextMenu = await renderContextMenu();
            const categoryLinks = createTestCategoryTitles(contextMenu);

            await contextMenu.renderPageCategories(categoryLinks);
            assureDefaultCategory(browserMocked.menuOptions, NONE_CATEGORY_NAME);
        });

        it('should mark a menu item for saving to a default category with a conspicuous prefix', async () => {
            const browserMocked = mockBrowser();
            const contextMenu = await renderContextMenu();
            const categoryLinks = createTestCategoryTitles(contextMenu);

            const expectedDefaultCategory = Randomiser.getRandomArrayItem(categoryLinks);
            await contextMenu.renderPageCategories(categoryLinks, expectedDefaultCategory);
            
            assureDefaultCategory(browserMocked.menuOptions, expectedDefaultCategory);
        });
        
        it('should pass a title of a non-default category when clicking its menu item', async () => {
            const browserMocked = mockBrowserWithTab();
            const contextMenu = await renderContextMenu();
            const categoryLinks = createTestCategoryTitles(contextMenu);

            const expectedCategory = categoryLinks[1];
            
            return new Promise((resolve, reject) => {
                const menuCallbackNameToTest = 'sendSaving';
                msgSenderChangedPropName = menuCallbackNameToTest;
                MessageSender[menuCallbackNameToTest] = info => {
                    if (info.categoryTitle === expectedCategory)
                        resolve();
                    else
                        reject(new Error(`'${info.categoryTitle}' !== '${expectedCategory}'`));
                };

                Expectation.expectResolution(contextMenu.renderPageCategories(categoryLinks, categoryLinks[0]), () => {
                    const menuToClick = browserMocked.menuOptions.find(op => op.title.endsWith(expectedCategory));
                    browserMocked.dispatchMenuClick(menuToClick.id);
                }).catch(reject);
            });
        });

        it('should pass a default category title when clicking its menu item', async () => {
            const browserMocked = mockBrowserWithTab();
            const contextMenu = await renderContextMenu();
            const categoryLinks = createTestCategoryTitles(contextMenu);

            const expectedDefaultCategory = Randomiser.getRandomArrayItem(categoryLinks);
            
            return new Promise((resolve, reject) => {
                const menuCallbackNameToTest = 'sendSaving';
                msgSenderChangedPropName = menuCallbackNameToTest;
                MessageSender[menuCallbackNameToTest] = info => {
                    if (info.categoryTitle === expectedDefaultCategory)
                        resolve();
                    else
                        reject(new Error(`'${info.categoryTitle}' !== '${expectedDefaultCategory}'`));
                };

                Expectation.expectResolution(contextMenu.renderPageCategories(categoryLinks, expectedDefaultCategory), () => {
                    const menuToClick = browserMocked.menuOptions.find(op => op.title.endsWith(expectedDefaultCategory));
                    browserMocked.dispatchMenuClick(menuToClick.id);
                });
            });
        });

        it('should pass the NONE category title when saving with no default category', async () => {
            const browserMocked = mockBrowserWithTab();
            const contextMenu = await renderContextMenu();
            const categoryLinks = createTestCategoryTitles(contextMenu);

            return new Promise((resolve, reject) => {
                const menuCallbackNameToTest = 'sendSaving';
                msgSenderChangedPropName = menuCallbackNameToTest;
                MessageSender[menuCallbackNameToTest] = info => {
                    if (info.categoryTitle === NONE_CATEGORY_NAME)
                        resolve();
                    else
                        reject(new Error(`'${info.categoryTitle}' !== '${NONE_CATEGORY_NAME}'`));
                };

                Expectation.expectResolution(contextMenu.renderPageCategories(categoryLinks, null), () => {
                    const menuToClick = browserMocked.menuOptions.find(op => op.title.endsWith(NONE_CATEGORY_NAME));
                    browserMocked.dispatchMenuClick(menuToClick.id);
                });
            });
        });

        it('should pass no category title when clicking on save', async () => {
            const browserMocked = mockBrowserWithTab();
            const contextMenu = await renderContextMenu();
            const categoryLinks = createTestCategoryTitles(contextMenu);

            const defaultCategory = Randomiser.getRandomArrayItem(categoryLinks);

            return new Promise((resolve, reject) => {
                const menuCallbackNameToTest = 'sendSaving';
                msgSenderChangedPropName = menuCallbackNameToTest;
                MessageSender[menuCallbackNameToTest] = info => {
                    if (info.categoryTitle === null)
                        resolve();
                    else
                        reject(new Error(`'${info.categoryTitle}' should be null`));
                };

                Expectation.expectResolution(contextMenu.renderPageCategories(categoryLinks, defaultCategory), 
                    () => browserMocked.dispatchMenuClick(OptionList.storage.save)).catch(reject);
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
            () => testRenderingLinks(NOTE_LINK_RENDERING_METHOD_NAME, createTestNoteLinks, menuHasAvailableNoteLinks));

        it('should remove all previous note links in menu while rendering afresh', 
            () => testRerenderingLinks(NOTE_LINK_RENDERING_METHOD_NAME, createTestNoteLinks, menuHasAvailableNoteLinks));

        it('should disable the navigational note submenu when rendering an empty list of notes and enable it otherwise', 
            () => testDisablingParentLinkMenuWhenEmpty(NOTE_LINK_RENDERING_METHOD_NAME, createTestNoteLinks, 'note-navigation'));
    });

    describe('#appendNoteLink', () => {
        it('should append a note link to menu', async () => {
            const browserMocked = mockBrowser();
            const contextMenu = await renderContextMenu();

            const expectedNoteLink = createRandomNoteLink();
            await contextMenu.appendNoteLink(expectedNoteLink.id, expectedNoteLink.text);
            
            assert(menuHasAvailableNoteLinks([expectedNoteLink], browserMocked.menuOptions));
        });
    });
    
    describe('#removeNoteLink', () => {
        it('should remove a note link from menu', async () => {
            const browserMocked = mockBrowser();
            const contextMenu = await renderContextMenu();

            const expectedNoteLinks = [createRandomNoteLink(), createRandomNoteLink(), createRandomNoteLink()];
            await contextMenu.renderNoteLinks(expectedNoteLinks);
            
            const noteLinkToRemove = expectedNoteLinks[0];
            await contextMenu.removeNoteLink(noteLinkToRemove.id);

            assert(!menuHasAvailableNoteLinks([noteLinkToRemove], browserMocked.menuOptions));
            assert(menuHasAvailableNoteLinks(expectedNoteLinks.filter(li => li.id !== noteLinkToRemove.id), browserMocked.menuOptions));
        });
    });

    describe('#emitItemClick', () => {
        it('should emit a click for some enabled button menu items', async () => {
            mockBrowserWithTab();
            const contextMenu = await renderContextMenu();
            contextMenu.enableMarkingBtn();

            let markingClicked = false;
            msgSenderChangedPropName = 'sendMarking';
            MessageSender[msgSenderChangedPropName] = () => markingClicked = true;
            await contextMenu.emitItemClick(OptionList.marking.mark);

            assert(markingClicked);
        });

        it('should not emit a click for a non-emittable button menu item', async () => {
            mockBrowserWithTab();
            const contextMenu = await renderContextMenu();

            let changeColourClicked = false;
            msgSenderChangedPropName = 'sendChangingColour';
            MessageSender[msgSenderChangedPropName] = () => changeColourClicked = true;
            await contextMenu.emitItemClick(OptionList.marking.setColour);

            assert(!changeColourClicked);
        });
    });
    
    describe('#renderShortcuts', function () {
        const renderTestShortcuts = async (contextMenu) => {
            const shortcuts = ShortcutPreferencesDOM.createTestShortcuts();
            await contextMenu.renderShortcuts(shortcuts);

            return shortcuts;
        };

        it('should render shortcuts for some emittable buttons', async () => {
            const browserMocked = mockBrowserWithTab();
            const contextMenu = await renderContextMenu();
            const shortcuts = await renderTestShortcuts(contextMenu);

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
        
        it('should change a shortcut for an emittable button', async () => {
            const browserMocked = mockBrowserWithTab();
            const contextMenu = await renderContextMenu();
            const shortcuts = await renderTestShortcuts(contextMenu);

            const cmdIds = Object.keys(shortcuts);
            const firstCmdId = cmdIds[0];
            shortcuts[firstCmdId].key = shortcuts[cmdIds[cmdIds.length - 1]].key;

            await contextMenu.renderShortcuts(shortcuts);
            const btn = browserMocked.menuOptions.find(op => op.id === firstCmdId);
            assert(btn.title.endsWith(`(${shortcuts[firstCmdId].key})`));
        });

        it('should remove a shortcut for some emittable buttons without emptying the others', async () => {
            const browserMocked = mockBrowserWithTab();
            const contextMenu = await renderContextMenu();
            const shortcuts = await renderTestShortcuts(contextMenu);

            const cmdIds = Object.keys(shortcuts);
            const firstCmdId = cmdIds[0];
            shortcuts[firstCmdId].key = null;
            
            const lastCmdId = cmdIds[cmdIds.length - 1];
            shortcuts[lastCmdId] = null;

            await contextMenu.renderShortcuts(shortcuts);
            browserMocked.menuOptions.forEach(op => {
                let shortcut;

                if (op.id === firstCmdId || op.id === lastCmdId)
                    ShortcutPreferencesDOM.assertTitleHasNoShortcut(op.title);
                else if ((shortcut = shortcuts[op.id]))
                    ShortcutPreferencesDOM.assertTitleHasShortcut(op.title, shortcut);
            });
        });

        it('should remove shortcuts for emittable buttons when there are none provided', async () => {
            const browserMocked = mockBrowserWithTab();
            const contextMenu = await renderContextMenu();
            await renderTestShortcuts(contextMenu);

            await contextMenu.renderShortcuts();
            browserMocked.menuOptions.forEach(op => {
                if (op.type === BTN_TYPE)
                    ShortcutPreferencesDOM.assertTitleHasNoShortcut(op.title);
            });
        });
    });
});
