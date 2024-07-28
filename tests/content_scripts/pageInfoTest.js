import assert from 'assert';
import { Randomiser } from '../tools/randomiser.js';
import { EnvLoader } from '../tools/envLoader.js';
import { BrowserMocked } from '../tools/browserMocked.js';
import { Expectation } from '../tools/expectation.js';
import { StorageHelper } from '../tools/storageHelper.js';
import { PageInfoHelper } from '../tools/pageInfoHelper.js';
import { PageInfo } from '../../content_scripts/pageInfo.js';
import { BrowserStorage } from '../../content_scripts/browserStorage.js';

describe('content_script/pageInfo', function () {
    this.timeout(0);

    const browser = new BrowserMocked();

    let storage;

    beforeEach('loadResources', done => {
        storage = browser.resetBrowserStorage();

        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });
    
    afterEach('releaseResources', () => {        
        EnvLoader.unloadDomModel();
    });

    describe('#load', function () {

        const WRONG_HTML_ERROR = { name: 'WrongHtmlError' };

        it('should throw an error while loading a page absent from the storage', () =>
            Expectation.expectRejection(new PageInfo().load(), 
                WRONG_HTML_ERROR, () => assert(storage.isEmpty()))
        );

        it('should throw an error while loading a page of a wrong format', () => {
            const itemKey = document.location.href;
            const browserStorage = new BrowserStorage(itemKey);

            const expectedObj = { id: Randomiser.getRandomNumberUpToMax() };
            
            return Expectation.expectResolution(browserStorage.set(expectedObj), () =>
                Expectation.expectRejection(new PageInfo().load(), WRONG_HTML_ERROR, 
                    () => {
                        assert.strictEqual(storage.length, 1);

                        return browserStorage.get().then(res =>
                            assert.deepStrictEqual(res, expectedObj));
                    })
            );
        });

        const testSavingPage = (saveFn, checkPageCategoriesFn) => {
            const parentDiv = document.createElement('div');
            parentDiv.id = Randomiser.getRandomNumberUpToMax();

            const childLabel = parentDiv.appendChild(document.createElement('label'));
            const expectedChildHtml = `Test ${Randomiser.getRandomString()} тест`;
            childLabel.innerHTML = expectedChildHtml;
            
            document.body.appendChild(parentDiv);

            return Expectation.expectResolution(saveFn(), async () => {
                parentDiv.remove();
                assert.strictEqual(document.getElementById(parentDiv.id), null);
    
                const pageInfoToLoad = new PageInfo();
                await pageInfoToLoad.load();

                checkPageCategoriesFn((await PageInfo.getAllSavedPagesWithCategories()).pageCategories, pageInfoToLoad);
    
                const loadedDiv = document.getElementById(parentDiv.id);
                assert(loadedDiv);
                assert.strictEqual(loadedDiv.childElementCount, 1);
                assert.strictEqual(loadedDiv.firstElementChild.innerHTML, expectedChildHtml);
            });
        };

        it('should load a page previously saved in the storage without a category', () =>
            testSavingPage(() => new PageInfo().save(), pageCategories => {
                assert.strictEqual(Object.getOwnPropertyNames(pageCategories).length, 0);
                assert.strictEqual(storage.length, 1);
            })
        );

        it('should load a page previously saved in the storage with a default category', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(), 
                async () => {
                    const storedCategories = await PageInfo.getAllSavedCategories();
                    const defaultCategoryTitle = storedCategories.find(c => c.default).title;

                    return testSavingPage(() => new PageInfo().save(() => defaultCategoryTitle), 
                        (pageCategories, pageInfo) => assert.strictEqual(pageCategories[pageInfo.uri], defaultCategoryTitle)
                    );
                }
            )
        );

        it('should load a page previously saved in the storage with a category', () => {
            const categoryTitle = '' + Randomiser.getRandomNumberUpToMax();

            return testSavingPage(() => new PageInfo().saveToCategory(categoryTitle), 
                (pageCategories, pageInfo) => {
                    assert.strictEqual(pageCategories[pageInfo.uri], categoryTitle);
                    assert.strictEqual(storage.length, 2);
                });
        });
    });

    describe('#save', function() {
        it('should not save a page stored in one category to a default category', () => {
            const pageInfoToLoad = new PageInfo();

            return Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(5, false, pageInfoToLoad.uri), async savedInfo => {
                let categoriesBySavedPages = savedInfo.pageCategories;
                const expectedCategory = categoriesBySavedPages[pageInfoToLoad.uri];

                await pageInfoToLoad.load();

                const defaultCategory = Object.values(categoriesBySavedPages).find(c => c !== expectedCategory);
                assert(defaultCategory);
                
                let defaultCategoryGetterActivated = false;
                const pageCategory = await pageInfoToLoad.save(() => {
                    defaultCategoryGetterActivated = true;
                    return defaultCategory;
                });
                assert.strictEqual(pageCategory, expectedCategory);
                assert.strictEqual(defaultCategoryGetterActivated, false);

                categoriesBySavedPages = (await PageInfo.getAllSavedPagesWithCategories()).pageCategories;
                assert.strictEqual(categoriesBySavedPages[pageInfoToLoad.uri], expectedCategory);
            });
        });
        
        it('should not save a page stored in one category to the NONE category', () => {
            const pageInfoToLoad = new PageInfo();
            
            return Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(5, false, pageInfoToLoad.uri), async savedInfo => {
                let categoriesBySavedPages = savedInfo.pageCategories;
                const expectedCategory = categoriesBySavedPages[pageInfoToLoad.uri];

                await pageInfoToLoad.load();

                const pageCategory = await pageInfoToLoad.save();
                assert.strictEqual(pageCategory, expectedCategory);

                categoriesBySavedPages = (await PageInfo.getAllSavedPagesWithCategories()).pageCategories;
                const currentCategory = categoriesBySavedPages[pageInfoToLoad.uri];
                assert.notStrictEqual(currentCategory, 'None');
                assert.strictEqual(currentCategory, expectedCategory);
            });
        });
        
        it('should save to a changed category when it was changed prior to saving', () => {
            const pageInfoToLoad = new PageInfo();
            
            return Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(5, false, pageInfoToLoad.uri), async savedInfo => {
                const initialCategory = savedInfo.pageCategories[pageInfoToLoad.uri];

                await pageInfoToLoad.load();

                savedInfo = await StorageHelper.saveTestPageEnvironment(3, false, pageInfoToLoad.uri);
                const expectedCategory = savedInfo.pageCategories[pageInfoToLoad.uri];

                const pageCategory = await pageInfoToLoad.save();
                assert.strictEqual(pageCategory, expectedCategory);
                assert.notStrictEqual(pageCategory, initialCategory);

                const categoriesBySavedPages = (await PageInfo.getAllSavedPagesWithCategories()).pageCategories;
                const currentCategory = categoriesBySavedPages[pageInfoToLoad.uri];
                assert.strictEqual(currentCategory, expectedCategory);
            });
        });
    });
    
    describe('#saveToCategory', function() {
        it('should save a page stored in one category to another category', () => {
            const pageInfoToLoad = new PageInfo();
            
            return Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(5, false, pageInfoToLoad.uri), async savedInfo => {
                let categoriesBySavedPages = savedInfo.pageCategories;
                const currentCategory = categoriesBySavedPages[pageInfoToLoad.uri];

                const expectedCategory = Object.values(categoriesBySavedPages).find(c => c !== currentCategory);
                assert(expectedCategory);

                await pageInfoToLoad.saveToCategory(expectedCategory);

                await pageInfoToLoad.load();
                categoriesBySavedPages = (await PageInfo.getAllSavedPagesWithCategories()).pageCategories;
                assert.strictEqual(categoriesBySavedPages[pageInfoToLoad.uri], expectedCategory);
            });
        });
    });

    describe('#canLoad', function() {
        it('should return true after both being saved and loaded', () => {
            const pageInfoToLoad = new PageInfo();
            
            return Expectation.expectResolution(pageInfoToLoad.canLoad(), async canBeLoaded => {
                assert.strictEqual(canBeLoaded, false);

                await pageInfoToLoad.save();
                canBeLoaded = await pageInfoToLoad.canLoad();
                assert.strictEqual(canBeLoaded, true);

                await pageInfoToLoad.load();
                canBeLoaded = await pageInfoToLoad.canLoad();
                assert.strictEqual(canBeLoaded, true);
            });
        });

        it('should return true after both being saved to a category and loaded', () => {
            const pageInfoToLoad = new PageInfo();
            
            return Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(5, false), async savedInfo => {
                let canBeLoaded = await pageInfoToLoad.canLoad();
                assert.strictEqual(canBeLoaded, false);

                const savingCategoryTitle = Randomiser.getRandomArrayItem(Object.values(savedInfo.pageCategories));
                await pageInfoToLoad.saveToCategory(savingCategoryTitle);

                canBeLoaded = await pageInfoToLoad.canLoad();
                assert.strictEqual(canBeLoaded, true);

                await pageInfoToLoad.load();
                canBeLoaded = await pageInfoToLoad.canLoad();
                assert.strictEqual(canBeLoaded, true);
            });
        });
    });

    describe('#shouldLoad', function () {
        it('should assure that a default uri is not for loading a page automatically', () =>
            assert(!new PageInfo().shouldLoad())
        );

        it('should recognise a uri with a particular hash for loading a page automatically', () => {
            const loadableUri = PageInfo.generateLoadingUrl(Randomiser.getRandomUri());
            
            global.location = new URL(loadableUri);
            global.history = {
                pushState: () => {}
            };
            
            assert(new PageInfo().shouldLoad());
        });
    });

    describe('#getAllSavedCategories', function () {
        it('should get previously saved categories',  () =>
            Expectation.expectResolution(StorageHelper.saveTestCategories(), async categories => {
                const storedInfo = await PageInfo.getAllSavedCategories();
                assert.deepStrictEqual(storedInfo, categories);
            })
        );
    });

    describe('#getAllSavedPagesWithCategories', function () {
        it('should get previously saved page info items without html alongsdide their categories', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(), 
                async savedInfo => {
                    const storedInfo = await PageInfo.getAllSavedPagesWithCategories();

                    savedInfo.pagesInfo.forEach(pi => delete pi[PageInfo.HTML_PROP_NAME]);
                    assert.deepStrictEqual(storedInfo.pagesInfo, savedInfo.pagesInfo);
                    assert.deepStrictEqual(storedInfo.pageCategories, savedInfo.pageCategories);
                })
        );
    });

    describe('#getAllSavedPagesFullInfo', function () {
        it('should get previously saved page info items with html from the storage', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(10), 
                async expectedPageInfos => {
                    const actualPageInfos = await PageInfo.getAllSavedPagesFullInfo();

                    assert(actualPageInfos.every(pi => pi[PageInfo.HTML_PROP_NAME]));

                    const categorisedPages = PageInfoHelper.fillPageCategories(
                        expectedPageInfos.pagesInfo, expectedPageInfos.pageCategories);
                    assert.deepStrictEqual(actualPageInfos, categorisedPages);
                })
        );
    });

    describe('#remove', function () {
        it('should remove previously saved page info items from the storage', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageInfo(5), async pageInfos => {
                const urisForRemoval = [pageInfos[0], pageInfos[pageInfos.length - 1]].map(pi => pi.uri);
                await PageInfo.remove(urisForRemoval);
                
                const actualPageInfos = await PageInfo.getAllSavedPagesFullInfo();
                assert.deepStrictEqual(actualPageInfos, pageInfos.filter(pi => !urisForRemoval.includes(pi.uri)));
            })
        );

        it('should remove nothing from the storage when passing an empty array of page uris', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageInfo(5), async pageInfos => {
                await PageInfo.remove([]);
                
                const actualPageInfos = await PageInfo.getAllSavedPagesFullInfo();
                assert.deepStrictEqual(actualPageInfos, pageInfos);
            })
        );
    });

    describe('#savePages', function () {
        const copyArray = (sourceArray) => sourceArray.map(p => Object.assign({}, p));

        const assertAbsenceOfCategories = (categories, pageCategories) => {
            assert(categories);
            assert(!categories.length);

            assert(pageCategories);
            assert(!Object.getOwnPropertyNames(pageCategories).length);
        };

        it('should save pages without categories into storage', () => {
            const testPages = PageInfoHelper.createPageInfoArray();
            const expectedPages = copyArray(testPages);

            return Expectation.expectResolution(PageInfo.savePages(testPages), 
                async savedData => {
                    assertAbsenceOfCategories(savedData.categories, savedData.pageCategories);
                    
                    const savedPages = savedData.importedPages;
                    assert(savedPages);
                    assert.strictEqual(savedPages.length, expectedPages.length);
                    
                    assert.deepStrictEqual(savedPages, testPages);
                
                    const storedPages = await PageInfo.getAllSavedPagesFullInfo();
                    assert.deepStrictEqual(storedPages, expectedPages);
                });
        });

        it('should save pages into storage excluding those with invalid uris', () => {
            const testPages = PageInfoHelper.createPageInfoArray();

            const pageWithInvalidUri = Randomiser.getRandomArrayItem(testPages);
            pageWithInvalidUri.uri = Randomiser.getRandomNumberUpToMax();

            const expectedPages = copyArray(testPages);

            return Expectation.expectResolution(PageInfo.savePages(testPages), 
                async savedData => {
                    assertAbsenceOfCategories(savedData.categories, savedData.pageCategories);

                    const savedPages = savedData.importedPages;
                    assert(savedPages);
                    assert.strictEqual(savedPages.length, expectedPages.length - 1);
        
                    assert(!savedPages.find(p => p.uri === pageWithInvalidUri.uri));

                    const storedPages = await PageInfo.getAllSavedPagesFullInfo(); 
                    assert(!storedPages.find(p => p.uri === pageWithInvalidUri.uri));
                });
        });

        it('should save pages into storage substituting invalid dates with nowadays', () => {
            const testPages = PageInfoHelper.createPageInfoArray();

            const pageWithInvalidDate = Randomiser.getRandomArrayItem(testPages);
            pageWithInvalidDate.date = Randomiser.getRandomNumberUpToMax();

            const expectedPages = copyArray(testPages);

            const assureExpectedDate = (actualPages) => {
                const nowString = new Date(Date.now()).toUTCString();

                const actualPage = actualPages.find(p => p.uri === pageWithInvalidDate.uri);
                assert.strictEqual(new Date(actualPage.date).toUTCString(), nowString);
            };

            return Expectation.expectResolution(PageInfo.savePages(testPages),
                async savedData => {
                    assertAbsenceOfCategories(savedData.categories, savedData.pageCategories);

                    const savedPages = savedData.importedPages;
                    assert(savedPages);
                    assert.strictEqual(savedPages.length, expectedPages.length);
        
                    assureExpectedDate(savedPages);
                    const storedPages = await PageInfo.getAllSavedPagesFullInfo();
                    assureExpectedDate(storedPages);
                });
        });

        it('should save pages into storage substituting empty titles with default ones', () => {
            const testPages = PageInfoHelper.createPageInfoArray();

            const pageWithDefaultTitle = testPages[0];
            pageWithDefaultTitle.title = undefined;
            pageWithDefaultTitle.uri = new URL(pageWithDefaultTitle.uri).origin;

            const pageWithUriTitle = testPages[1];
            pageWithUriTitle.title = '';

            const expectedPages = copyArray(testPages);

            const assureExpectedTitles = (actualPages) => {
                let actualPage = actualPages.find(p => p.uri === pageWithDefaultTitle.uri);
                assert.strictEqual(actualPage.title, 'Unknown');
    
                actualPage = actualPages.find(p => p.uri === pageWithUriTitle.uri);
                assert.strictEqual(actualPage.title, 
                    new URL(pageWithUriTitle.uri).pathname.substring(1));
            };

            return Expectation.expectResolution(PageInfo.savePages(testPages), 
                async savedData => {
                    assertAbsenceOfCategories(savedData.categories, savedData.pageCategories);

                    const savedPages = savedData.importedPages;
                    assert(savedPages);
                    assert.strictEqual(savedPages.length, expectedPages.length);
        
                    assureExpectedTitles(savedPages);
                    const storedPages = await PageInfo.getAllSavedPagesFullInfo();
                    assureExpectedTitles(storedPages);
                });
        });

        it('should save pages adding new categories and expanding existent ones in storage', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(10),
                async initialInfo => {
                    const pagesToSave = PageInfoHelper.createPageInfoArray(8);            

                    const storedCategories = await PageInfo.getAllSavedCategories();

                    const categories = copyArray(storedCategories);
                    pagesToSave.forEach((p, index) => {
                        if (!(index % 3))
                            return;

                        const createNewCategory = index % 2;
                        const category = createNewCategory ? 
                            '' + Randomiser.getRandomNumberUpToMax(): 
                            Randomiser.getRandomArrayItem(storedCategories).title;

                        initialInfo.pageCategories[p.uri] = category;
                        p.category = category;

                        if (createNewCategory)
                            categories.push(PageInfoHelper.createCategory(category, false));
                    });

                    const expectedPages = copyArray(pagesToSave);

                    const savedData = await PageInfo.savePages(pagesToSave);

                    assert.deepStrictEqual(savedData.importedPages, 
                        expectedPages.map(p => {
                            const copy = Object.assign({}, p);
                            delete copy[PageInfo.HTML_PROP_NAME];
                            delete copy.category;

                            return copy;
                        }));
                    
                    assert.deepStrictEqual(savedData.pageCategories, initialInfo.pageCategories);

                    assert.deepStrictEqual(savedData.categories, categories);

                    const storedPages = await PageInfo.getAllSavedPagesFullInfo();

                    expectedPages.forEach(ep =>
                        assert.deepStrictEqual(storedPages.find(sp => sp.uri === ep.uri), ep));
                    
                    initialInfo.pagesInfo.forEach(pi => {
                        const actualPage = storedPages.find(sp => sp.uri === pi.uri);
                        assert(actualPage);
                        assert.strictEqual(actualPage.category, initialInfo.pageCategories[pi.uri]);

                        delete actualPage.category;
                        assert.deepStrictEqual(actualPage, pi);
                    });
                });
        });
    });

    describe('#saveCategories', function () {
        it('should save categories into storage', async () => {
            const testCategories = PageInfoHelper.createCategoryArray();
            
            await PageInfo.saveCategories(testCategories);
           
            return Expectation.expectResolution(PageInfo.getAllSavedCategories(), 
                savedCategories => {
                    assert(savedCategories);
                    assert.strictEqual(savedCategories.length, testCategories.length);
                    assert.deepStrictEqual(savedCategories, testCategories);
                });
        });
    });

    describe('#savePageCategories', function () {
        it('should save page categories into storage', async () => {
            const testPageCategories = PageInfoHelper.createPageCategories().pageCategories;
            
            await PageInfo.savePageCategories(testPageCategories);
           
            return Expectation.expectResolution(PageInfo.getAllSavedPagesWithCategories(), 
                pageInfo => {
                    const savedPageCategories = pageInfo.pageCategories;
                    assert(savedPageCategories);
                    assert.strictEqual(savedPageCategories.length, testPageCategories.length);
                    assert.deepStrictEqual(savedPageCategories, testPageCategories);
                });
        });
    });
});
