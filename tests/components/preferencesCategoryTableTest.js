import assert from 'assert';
import { EnvLoader } from '../tools/envLoader.js';
import { BrowserMocked } from '../tools/browserMocked';
import { Randomiser } from '../tools/randomiser.js';
import { Expectation } from '../tools/expectation.js';
import { Preferences } from '../../components/preferences.js';
import { CategoryPreferencesDOM, PagePreferencesDOM } from '../tools/preferencesDOM.js';
import { StorageHelper } from '../tools/storageHelper.js';
import { PageInfoHelper } from '../tools/pageInfoHelper.js';
import { PreferencesTestHelper } from '../tools/preferencesTestHelper.js';
import { ArrayExtension } from '../../content_scripts/arrayExtension.js';
import { PageInfo } from '../../content_scripts/pageInfo.js';
import { SenderMessage } from '../../components/senderMessage.js';

describe('components/preferences/categoryTable', function () {
    this.timeout(0);

    const browserMocked = new BrowserMocked();

    beforeEach('loadResources', done => {
        browserMocked.resetBrowserStorage();
        browserMocked.resetRuntime();

        CategoryPreferencesDOM.loadDomModel().then(() => done()).catch(done);
    });

    afterEach('releaseResources', () => {        
        EnvLoader.unloadDomModel();
    });

    const pageTableDOM = new PagePreferencesDOM();
    const categoryTableDOM = new CategoryPreferencesDOM();

    describe('#add', function () {

        it('should assure that the button adding categories is enabled despite checked rows', () =>
            Expectation.expectResolution(StorageHelper.saveTestCategories(3), 
                () => new Preferences().load().then(() => {
                    const addBtn = categoryTableDOM.getAddingBtn();
                    assert(!addBtn.disabled);

                    categoryTableDOM.tickRowCheck(1);
                    assert(!addBtn.disabled);

                    categoryTableDOM.tickAllRowChecks();
                    assert(!addBtn.disabled);

                    categoryTableDOM.tickAllRowChecks();
                    assert(!addBtn.disabled);
                }))
        );

        const addCategories = (count, expectedItems = [], onWarning = null) => {
            const addBtn = categoryTableDOM.getAddingBtn();

            const inputs = [];

            for (let i = 0; i < count; ++i) {
                const input = '' + (expectedItems[i] == null ? 
                    Randomiser.getRandomNumberUpToMax(): expectedItems[i]);

                const titleTxt = categoryTableDOM.getNewCategoryTitleTxt();
                titleTxt.value = input;

                categoryTableDOM.dispatchClickEvent(addBtn);

                if (categoryTableDOM.hasStatusMessages()) {
                    if (onWarning)
                        onWarning(input);
                    else
                        assert.fail('A status message wasn\'t expected');
                } else {
                    assert(!titleTxt.value,
                        'A field with a new category name should be emptied after successfull input');
                    inputs.push(input);
                }
            }

            return inputs;
        };

        it('should add a few new categories in UI', () =>
            Expectation.expectResolution(new Preferences().load(),
                () => {
                    categoryTableDOM.assertTableValues(
                        addCategories(5).map(c => PageInfoHelper.createCategory(c)));
                    categoryTableDOM.assertStatusIsEmpty();
                })
        );

        it('should save new categories and send them in a message to server', 
            () => Expectation.expectResolution(StorageHelper.saveTestCategories(3, -1),
                async categories => {
                    const preferences = new Preferences();

                    await preferences.load();

                    categories.push(...addCategories(3).map(c => PageInfoHelper.createCategory(c)));
                    
                    const defaultCategoryTitle = categoryTableDOM.tickRowCheckByIndex(4);
                    categoryTableDOM.dispatchClickEvent(categoryTableDOM.getMakingDefaultBtn());
                    categories.find(c => c.title === defaultCategoryTitle).default = true;

                    categoryTableDOM.assertStatusIsEmpty();

                    await preferences.save();
                    
                    const savedCategories = await PageInfo.getAllSavedCategories();
                    const expectedCategories = new Map(categories.map(c => [c.title, c.default]));
                    assert.strictEqual(savedCategories.length, expectedCategories.size);
                    assert(savedCategories.every(sc => { 
                        return expectedCategories.get(sc.title) === sc.default; 
                    }));

                    const msgs = browserMocked.getRuntimeMessages();
                    assert.strictEqual(msgs.length, 1);
                    const senderMsg = new SenderMessage(msgs[0]);
                    assert(senderMsg.shouldAddCategories());
                    
                    assert.strictEqual(senderMsg.categories.length, expectedCategories.size);
                    assert(senderMsg.categories.every(st => expectedCategories.has(st)));
                    assert.deepStrictEqual(senderMsg.defaultCategory, defaultCategoryTitle);
                })
        );

        it('should warn while adding a category with an existent name', () => 
            Expectation.expectResolution(new Preferences().load(), 
                () => {
                    const duplicatedCategoryName = Randomiser.getRandomString();

                    const newItems = addCategories(5, [duplicatedCategoryName, duplicatedCategoryName],
                        () => categoryTableDOM.assertStatusIsWarning(duplicatedCategoryName));

                    categoryTableDOM.assertTableValues(newItems.map(
                        c => PageInfoHelper.createCategory(c)));
                })
        );

        it('should warn when adding a category with an empty name', () => 
            Expectation.expectResolution(new Preferences().load(), 
                () => {
                    const emptyName = '';

                    const newItems = addCategories(5, [emptyName],
                        input => {
                            categoryTableDOM.assertStatusIsWarning();
                            assert.strictEqual(input, emptyName);
                        });

                    categoryTableDOM.assertTableValues(newItems.map(
                        c => PageInfoHelper.createCategory(c)));
                })
        );

        it('should warn while adding a category with a too long name', () => 
            Expectation.expectResolution(new Preferences().load(), 
                () => {
                    const tooLongCategoryName = Randomiser.getRandomString() + 
                        Randomiser.getRandomString();

                    const newItems = addCategories(5, [tooLongCategoryName],
                        () => categoryTableDOM.assertStatusIsWarning());

                    categoryTableDOM.assertTableValues(newItems.map(
                        c => PageInfoHelper.createCategory(c)));
                })
        );

        it('should warn while adding a category with the None category name', () =>
            Expectation.expectResolution(new Preferences().load(), 
                () => {
                    const noneCategory = 'none';

                    let warningCount = 0;
                    const newItems = addCategories(5, [noneCategory, noneCategory.toUpperCase()],
                        () => {
                            categoryTableDOM.assertStatusIsWarning(noneCategory);

                            ++warningCount;
                        });

                    assert.strictEqual(warningCount, 2);
                    categoryTableDOM.assertTableValues(newItems
                        .map(c => PageInfoHelper.createCategory(c)));
                })
        );

        it('should add a new category to the page category filter and selector', () =>
            Expectation.expectResolution(new Preferences().load(), 
                () => {
                    const newItems = addCategories(3);

                    const assertListContainsCategories = list => {
                        const options = PagePreferencesDOM.getSelectOptionTexts(list);

                        assert(newItems.every(i => options.includes(i)));
                    };
                    
                    assertListContainsCategories(pageTableDOM.getCategoryFilterList());
                    assertListContainsCategories(pageTableDOM.getCategorySelectorList());
                })
        );
    });

    describe('#makeDefault', function () {

        it('should disable the button when several rows are checked', () => {
            return Expectation.expectResolution(StorageHelper.saveTestCategories(),
                () => new Preferences().load()
                    .then(() => {
                        categoryTableDOM.tickRowCheck(2);
                        assert(categoryTableDOM.getMakingDefaultBtn().disabled);
                    })
            );
        });

        const markAnotherCategoryDefault = categories => {
            let newDefCategoryIndex;
            const curDefCategory = ArrayExtension.sortAsc(categories, 'title').find((c, index) => {
                if (c.default)
                    return true;
                
                newDefCategoryIndex = index;
                return false;
            });

            assert(curDefCategory);

            newDefCategoryIndex = newDefCategoryIndex >= 0 ? newDefCategoryIndex: categories.length - 1;
            const defaultCatTitle = categoryTableDOM.tickRowCheckByIndex(newDefCategoryIndex);

            categoryTableDOM.dispatchClickEvent(categoryTableDOM.getMakingDefaultBtn());

            return defaultCatTitle;
        };

        it('should save another default category', () =>
            Expectation.expectResolution(StorageHelper.saveTestCategories(),
                async categories => {
                    const preferences = new Preferences();

                    await preferences.load();

                    const defaultCatTitle = markAnotherCategoryDefault(categories);

                    await preferences.save();
                    
                    const savedCategories = await PageInfo.getAllSavedCategories();
                    assert.strictEqual(savedCategories.length, categories.length);

                    const defaultCategories = savedCategories.filter(sc => sc.default === true);
                    assert.strictEqual(defaultCategories.length, 1);
                    assert.strictEqual(defaultCategories[0].title, defaultCatTitle);
                })
        );

        it('should make another category default', () => {
            return Expectation.expectResolution(StorageHelper.saveTestCategories(5),
                categories => new Preferences().load()
                    .then(() => {
                        const categoryTitle = markAnotherCategoryDefault(categories);

                        let defaultCategory;
                        categories.forEach(c => {
                            c.default = c.title === categoryTitle;

                            if (c.default)
                                defaultCategory = c;
                        });
                        categoryTableDOM.assertTableValues(categories);

                        categoryTableDOM.dispatchClickEvent(
                            categoryTableDOM.getMakingDefaultBtn());

                        defaultCategory.default = false;
                        categoryTableDOM.assertTableValues(categories);
                    })
            );
        });
    });

    describe('#remove', function () {

        it('should enable button for removing several categories', () => {
            return Expectation.expectResolution(StorageHelper.saveTestCategories(),
                () => new Preferences().load()
                    .then(() => {
                        categoryTableDOM.tickRowCheck(2);
                        assert(!categoryTableDOM.getRemovingBtn().disabled);
                    })
            );
        });
    
        it('should enable button for removing when all categories are checked', () => {
            return Expectation.expectResolution(StorageHelper.saveTestCategories(),
                () => new Preferences().load()
                    .then(() => {
                        categoryTableDOM.tickAllRowChecks();
                        assert(!categoryTableDOM.getRemovingBtn().disabled);
                    })
            );
        });

        it('should remove several categories', () =>
            Expectation.expectResolution(StorageHelper.saveTestCategories()
                .then(async expectedCategories => {
                    const removedTitles = await preferencesTester.removeFirstTwoRows();

                    const categories = await PageInfo.getAllSavedCategories();
                    assert.deepStrictEqual(categories, 
                        expectedCategories.filter(c => !removedTitles.includes(c.title)));
                }))
        );

        it('should remove categories from the page category filter and selector', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageCategories(5)
                .then(async () => {
                    const removedTitles = await preferencesTester.removeFirstTwoRows();

                    const assertListHasNoCategories = list => {
                        const options = PagePreferencesDOM.getSelectOptionTexts(list);

                        assert(removedTitles.every(i => !options.includes(i)));
                    };

                    assertListHasNoCategories(pageTableDOM.getCategoryFilterList());
                    assertListHasNoCategories(pageTableDOM.getCategorySelectorList());
                }))
        );

        it('should uncategorise pages of a removed category', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(10, false)
                .then(async savedInfo => {
                    const removedTitles = await preferencesTester.removeFirstTwoRows();

                    const removedPageUris = removedTitles.reduce((pages, catTitle) => {
                        pages.push(...PageInfoHelper.getCategoryPages(
                            savedInfo.pageCategories, catTitle));
                        return pages;
                    }, []);
                    assert(removedPageUris.length);

                    const removedPages = savedInfo.pagesInfo.filter(
                        p => removedPageUris.includes(p.uri));
                    assert(removedPages.length);

                    pageTableDOM.assertTableValues(removedPages);
                }));
        });

        it('should choose a default category in the page category filter rather than a removed one', () => {
            const defaultCategoryIndex = 1;

            return Expectation.expectResolution(StorageHelper.saveTestPageCategories(5, defaultCategoryIndex)
                .then(async pageCategories => {
                    const defaultCategoryTitle = [...new Set(Object.values(pageCategories))]
                        .sort()[defaultCategoryIndex];

                    const removedTitles = await preferencesTester.removeFirstTwoRows();

                    const filterList = pageTableDOM.getCategoryFilterList();
                    assert(removedTitles.includes(defaultCategoryTitle));

                    const selectedOption = [...filterList.options].find(op => op.selected);
                    assert(selectedOption);

                    const selectedCategory = selectedOption.innerText;
                    assert(removedTitles.every(t => t !== selectedCategory)); 
                    assert(selectedCategory);
                }));
        });
    });

    const preferencesTester = new PreferencesTestHelper(categoryTableDOM);

    describe('#search', function () {

        it('should filter the results by clicking enter in the respective field', () => 
            Expectation.expectResolution(StorageHelper.saveTestCategories(5),
                categories => preferencesTester.searchByEnterClick(categories))
        );

        it('should filter the results by changing text in the respective field', () => 
            Expectation.expectResolution(StorageHelper.saveTestCategories(5),
                categories => preferencesTester.searchByInputting(categories))
        );
    });

    describe('#sort', function () {

        const TITLE_FIELD_NAME = 'title';

        it('should sort categories by their titles', () => {
            return Expectation.expectResolution(StorageHelper.saveTestCategories(10),
                categories => new Preferences().load()
                    .then(() => {
                        const titleHeader = preferencesTester.getFieldHeader(TITLE_FIELD_NAME);

                        assert.deepStrictEqual(preferencesTester.sortBySecondField(titleHeader), 
                            ArrayExtension.sortDesc(categories, TITLE_FIELD_NAME)
                                .map(c => c[TITLE_FIELD_NAME]));
                        assert(categoryTableDOM.isHeaderSortedDesc(titleHeader));

                        assert.deepStrictEqual(preferencesTester.sortBySecondField(titleHeader), 
                            ArrayExtension.sortAsc(categories, TITLE_FIELD_NAME)
                                .map(c => c[TITLE_FIELD_NAME]));
                        assert(categoryTableDOM.isHeaderSortedAsc(titleHeader));
                    })
            );
        });

        it('should sort filtered rows without changing the data', () => 
            Expectation.expectResolution(StorageHelper.saveTestCategories(5),
                async categories => {
                    await preferencesTester.searchByInputting(categories);

                    const titleHeader = preferencesTester.getFieldHeader(TITLE_FIELD_NAME);
                    preferencesTester.sortBySecondField(titleHeader);

                    preferencesTester.assertSearchOutcome();
                })
        );
    });
});
