import assert from 'assert';
import { ContextMenu } from '../../components/contextMenu';
import { BrowserMocked } from '../tools/browserMocked';
import { Randomiser } from '../tools/randomiser';
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
            const browserMocked = mockBrowser();
            browserMocked.setBrowserTab();
            
            const menu = new ContextMenu();

            menu[menuCallbackNameToTest] = 
                (tabInfo) => assert(tabInfo.tabId && tabInfo.colourClass);
            
            const menuOptions = browserMocked.menuOptions;
            const foundItems = menuOptions.filter(filterMenuItemCallback);
            
            assert(foundItems.length);

            return Promise.all(foundItems.map(item => {
                assert(item.onclick);
                
                return (async () => {
                    const tabItemInfo = { menuItemId: Randomiser.getRandomNumberUpToMax() };

                    await item.onclick(tabItemInfo);

                    if (onClickedCallback)
                        onClickedCallback(tabItemInfo, menu);
                })().then(() => {
                    const tabQueries = browserMocked.tabQueries;
                    assert.strictEqual(tabQueries.length, foundItems.length);
                    assert(tabQueries.every(t => t.active && t.currentWindow));
                }); 
            }));
        };

        it('should run event callbacks while marking and unmarking', () =>
            Promise.all([{ id: 'mark', callbackName: 'onMarking' }, 
                { id: 'unmark', callbackName: 'onUnmarking' }]
                .map(o => testClickingOnMenuItem(o.callbackName, i => i.id === o.id))));

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

    describe('#renderCategories', () => {
        it('should render categories for saving in menu');

        it('should remove all previous categories in menu while rendering afresh');

        it('should disable the category submenu when rendering the empty list and enable it otherwise');
        
        it('should disable the category submenu if the save menu is not available');
    });

    describe('#renderNoteLinks', () => {

        it('should render note links in menu', () => {
            const browserMocked = mockBrowser();
            const contextMenu = new ContextMenu();

            const expectedNoteLinks = [createRandomNoteLink(), createRandomNoteLink()];
            
            contextMenu.renderNoteLinks(expectedNoteLinks);
            
            assert(menuHasAvailableNoteLinks(expectedNoteLinks, browserMocked.menuOptions));
        });

        it('should remove all previous note links in menu while rendering afresh', () => {
            const browserMocked = mockBrowser();
            const contextMenu = new ContextMenu();

            const noteLinksToRemove = [createRandomNoteLink(), createRandomNoteLink()];
            contextMenu.renderNoteLinks(noteLinksToRemove);

            const expectedNoteLinks = [createRandomNoteLink(), createRandomNoteLink()];
            contextMenu.renderNoteLinks(expectedNoteLinks);

            assert(!menuHasAvailableNoteLinks(noteLinksToRemove, browserMocked.menuOptions));
            assert(menuHasAvailableNoteLinks(expectedNoteLinks, browserMocked.menuOptions));
        });

        const assertParentAvailability = (actualMenuOptions, shouldBeAvailable) => {
            const parentId = 'note-navigation';
            const parentBtn = actualMenuOptions.find(btn => btn.id === parentId);
            assert(parentBtn);

            assert.strictEqual(parentBtn.enabled, shouldBeAvailable);
        };

        it('should disable the navigational note submenu when rendering an empty list of notes and enable it otherwise', () => {
            const browserMocked = mockBrowser();

            const contextMenu = new ContextMenu();

            const noteLinks = [createRandomNoteLink(), createRandomNoteLink()];
            contextMenu.renderNoteLinks(noteLinks);

            contextMenu.renderNoteLinks([]);
            assertParentAvailability(browserMocked.menuOptions, false);

            contextMenu.renderNoteLinks(noteLinks);
            assertParentAvailability(browserMocked.menuOptions, true);
        });
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
});
