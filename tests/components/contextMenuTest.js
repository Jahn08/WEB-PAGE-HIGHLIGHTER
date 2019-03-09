import assert from 'assert';
import { ContextMenu } from '../../components/contextMenu';
import { BrowserMocked } from '../tools/browserMocked';

describe('components/ContextMenu', () => {
    describe('#constructor', () => {
        let itemOptions;
        let contextMenu;

        it('should create a proper number of items in a context menu', () => {
            const browserMocked = new BrowserMocked()
            browserMocked.setBrowserMenu();
            contextMenu = new ContextMenu();

            itemOptions = browserMocked.options;
            assert.strictEqual(itemOptions.length, 11);
            assert.strictEqual(itemOptions.filter(i => i.type === 'separator').length, 2);
            assert.strictEqual(itemOptions.filter(i => i.type === 'normal').length, 3);
            assert.strictEqual(itemOptions.filter(i => i.type === 'radio').length, 6);
        });

        it('should change visibility of button items in a context menu', () => {
            contextMenu.makeReadyForMarking();

            const btnOptions = itemOptions.filter(i => i.type === 'normal' && i.visible !== undefined);
            assert.strictEqual(btnOptions.length, 2);
            
            const assertHavingOnlyVisibleItem = () => 
                assert.strictEqual(btnOptions.filter(b => b.visible).length, 1);
            assertHavingOnlyVisibleItem();

            contextMenu.makeReadyForUnmarking();
            assertHavingOnlyVisibleItem();
        });
    });
});
