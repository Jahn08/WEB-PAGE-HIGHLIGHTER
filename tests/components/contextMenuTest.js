import assert from 'assert';
import { ContextMenu } from '../../components/contextMenu';
import { BrowserMocked } from '../tools/browserMocked';
import { Randomiser } from '../tools/randomiser';

describe('components/ContextMenu', () => {
    const mockBrowser = () => {
        const browserMocked = new BrowserMocked()
        browserMocked.setBrowserMenu();
        return browserMocked;
    };
    
    describe('#constructor', () => {
        it('should create a proper number of items in a context menu', () => {
            const browserMocked = mockBrowser();
            new ContextMenu();

            const itemOptions = browserMocked.menuOptions;
            assert.strictEqual(itemOptions.length, 11);
            assert.strictEqual(itemOptions.filter(i => i.type === 'separator').length, 2);
            assert.strictEqual(itemOptions.filter(i => i.type === 'normal').length, 3);
            assert.strictEqual(itemOptions.filter(i => i.type === 'radio').length, 6);
        });

        const testClickingOnMenuItem = (menuCallbackNameToTest, filterMenuItemCallback) => {
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
                
                return new Promise(async resolve => {
                    await item.onclick({ menuItemId: Randomiser.getRandomNumberUpToMax() });
                    resolve();
                }).then(() => {
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

        it('should run event callbacks while clicking on menu items to change colours', 
            () => testClickingOnMenuItem('onChangingColour', i => i.type === 'radio'));
    });

    it('should change visibility of button items in a context menu', () => {
        const browserMocked = mockBrowser();
        const contextMenu = new ContextMenu();

        contextMenu.hideMarkingBtn();
        contextMenu.hideUnmarkingBtn();

        const btnOptions = browserMocked.menuOptions
            .filter(i => i.type === 'normal' && i.visible !== undefined);
        assert.strictEqual(btnOptions.length, 2);
        
        const assertItemsVisibility = (visible) => assert(btnOptions.every(b => b.visible === visible));
        assertItemsVisibility(false);

        contextMenu.showMarkingBtn();
        contextMenu.showUnmarkingBtn();
        assertItemsVisibility(true);
    });

    describe('#currentColourClass', () => {
        it('should return a current colour class, chosen in a menu');
    });
});
