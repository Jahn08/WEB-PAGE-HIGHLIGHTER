import assert from 'assert';
import { Randomiser } from '../tools/randomiser.js';
import { OptionList } from '../../content_scripts/menuMessageEvent.js';

describe('content_script/optionList', function() {
    describe('#storage.getCategoryId', () => {
        it('should format a category ID from its index and title', () => {
            const index = Randomiser.getRandomNumberUpToMax();
            const title = Randomiser.getRandomString();
            const categoryId = OptionList.storage.getCategoryId(index, title);
            assert.strictEqual(categoryId, `category-${index}-${title}`);
        });
    });
    
    describe('#storage.getCategoryTitleFromId', () => {
        it('should return a category title from its ID', () => {
            const index = Randomiser.getRandomNumberUpToMax();
            const expectedTitle = `dashed-${Randomiser.getRandomString()}-title`;
            const title = OptionList.storage.getCategoryTitleFromId(`category-${index}-${expectedTitle}`);
            assert.strictEqual(title, expectedTitle);
        });
    });
});
