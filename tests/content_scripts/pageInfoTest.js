import assert from 'assert';
import { Randomiser } from '../tools/randomiser.js';
import { EnvLoader } from '../tools/envLoader.js';
import { BrowserMocked } from '../tools/browserMocked.js';
import { Expectation } from '../tools/expectation.js';
import { StorageHelper } from '../tools/storageHelper.js';
import { PageInfoHelper } from '../tools/pageInfoHelper.js';

describe('content_script/pageInfo', function () {
    this.timeout(0);

    const browser = new BrowserMocked();

    let storage;

    beforeEach('loadResources', done => {
        storage = browser.resetBrowserStorage();

        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/pageInfo.js', 'PageInfo')
            .then(() => done())
            .catch(done);
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

        it('should load a page previously saved in the storage', () => {
            const parentDiv = document.createElement('div');
            parentDiv.id = Randomiser.getRandomNumberUpToMax();

            const childLabel = parentDiv.appendChild(document.createElement('label'));
            childLabel.innerHTML = Randomiser.getRandomNumberUpToMax();

            document.body.appendChild(parentDiv);

            const pageInfo = new PageInfo();

            return Expectation.expectResolution(pageInfo.save(), async () => {
                parentDiv.remove();

                assert.strictEqual(document.getElementById(parentDiv.id), null);
    
                await new PageInfo().load();
    
                assert.strictEqual(storage.length, 1);
    
                const loadedDiv = document.getElementById(parentDiv.id);
                assert(loadedDiv);
                assert.strictEqual(loadedDiv.childElementCount, 1);
    
                assert.strictEqual(loadedDiv.firstElementChild.innerHTML, childLabel.innerHTML);
            });
        });
    });

    describe('#shouldLoad', function () {
        it('should assure that a default uri is not for loading a page automatically', () =>
            assert(!new PageInfo().shouldLoad())
        );

        it('should recognise a uri with a particular hash for loading a page automatically', () => {
            const originalLocation = document.location;

            try {
                const loadableUri = PageInfo.generateLoadingUrl(location.href);
                document.location = new URL(loadableUri);

                assert(new PageInfo().shouldLoad());
            }
            finally {
                document.location = originalLocation;
            }            
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
