import assert from 'assert';
import { ContextMenu } from '../../components/contextMenu';
import { BrowserMocked } from '../tools/browserMocked';

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

            const itemOptions = browserMocked.options;
            assert.strictEqual(itemOptions.length, 11);
            assert.strictEqual(itemOptions.filter(i => i.type === 'separator').length, 2);
            assert.strictEqual(itemOptions.filter(i => i.type === 'normal').length, 3);
            assert.strictEqual(itemOptions.filter(i => i.type === 'radio').length, 6);
        });

        it('should run event callbacks while imitating clicks on menu items');
    });

    it('should change visibility of button items in a context menu', () => {
        const browserMocked = mockBrowser();
        const contextMenu = new ContextMenu();

        contextMenu.hideMarkingBtn();
        contextMenu.hideUnmarkingBtn();

        const btnOptions = browserMocked.options
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
