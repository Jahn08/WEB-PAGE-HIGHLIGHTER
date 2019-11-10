import assert from 'assert';
import { EnvLoader } from '../tools/envLoader.js';
import { PageInfoHelper } from '../tools/pageInfoHelper.js';

describe('content_script/categoryView', function() {

    before(done => {
        EnvLoader.loadClass('./content_scripts/pageInfo.js', 'CategoryView')
            .then(() => done())
            .catch(done);
    });

    describe('#constructor', function() {

        it('should construct an array of category titles from page categories', () => {
            const categories = PageInfoHelper.createCategoryArray();

            assert.deepStrictEqual(new CategoryView(categories).categoryTitles, 
                categories.map(c => c.title));
        });

        it('should return a title of a default category', () => {
            const categories = PageInfoHelper.createCategoryArray();

            assert.strictEqual(new CategoryView(categories).defaultCategoryTitle, 
                (categories.find(c => c.default) || {}).title);
        });

        it('should return null when there is no default category', () => {
            const categories = PageInfoHelper.createCategoryArray(5, -1);
            
            assert(!new CategoryView(categories).defaultCategoryTitle);
        });
    });
});
