import assert from 'assert';
import { EnvLoader } from '../tools/envLoader.js';
import { BrowserMocked } from '../tools/browserMocked';
import { Randomiser } from '../tools/randomiser.js';
import { Expectation } from '../tools/expectation.js';
import { Preferences, PagePackageError } from '../../components/preferences.js';
import { PagePreferencesDOM, CategoryPreferencesDOM } from '../tools/preferencesDOM.js';
import { PreferencesTestHelper } from '../tools/preferencesTestHelper.js';
import { StorageHelper } from '../tools/storageHelper.js';
import { FileTransfer } from '../tools/fileTransfer.js';
import fs from 'fs';
import { PageInfoHelper } from '../tools/pageInfoHelper.js';

describe('components/preferences/pageTable', function () {
    this.timeout(0);

    const browserMocked = new BrowserMocked();

    beforeEach('loadResources', done => {
        browserMocked.resetBrowserStorage();

        PagePreferencesDOM.loadDomModel().then(() => done()).catch(done);
    });
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/pageInfo.js', 'PageInfo', 'CategoryView')
            .then(() => EnvLoader.loadClass('./content_scripts/lzwCompressor.js', 'LZWCompressor')
                .then(() => done()))
            .catch(done);
    });

    afterEach('releaseResources', () => {        
        EnvLoader.unloadDomModel();
    });

    const pageTableDOM = new PagePreferencesDOM();
    const categoryTableDOM = new CategoryPreferencesDOM();

    describe('#open', function () {

        const getShowingUriBtn = () => document.getElementById('form--section-page--btn-show');

        it('should load saved page data and open its uri as loadable', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageInfo(),
                async () => {
                    await new Preferences().load();
                
                    const uriForShowing = pageTableDOM.tickRowCheck()[0];

                    let pageIsOpened = false;
                    window.open = (uri, target) => {
                        assert.strictEqual(target, '_blank');
                        assert(uri.startsWith(uriForShowing));
                        
                        assert.strictEqual(PageInfo.generateLoadingUrl(uriForShowing), 
                            uri);

                        pageIsOpened = true;
                    };

                    const btn = getShowingUriBtn();
                    assert(!btn.disabled);
                    
                    pageTableDOM.dispatchClickEvent(btn);

                    assert(pageIsOpened, `A page with url '${uriForShowing}' wasn't open`);
                }
            )
        );

        it('should disable button for showing several uris', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(),
                () => new Preferences().load()
                    .then(() => {
                        pageTableDOM.tickRowCheck(2);
                        assert(getShowingUriBtn().disabled);
                    })
            );
        });
    });

    describe('#move', function () {
        it('should enable button for moving several pages to another category', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(),
                async () => {
                    await new Preferences().load();
                    assert(pageTableDOM.getRelocatingBtn().disabled);

                    pageTableDOM.tickRowCheck(2);
                    assert(!pageTableDOM.getRelocatingBtn().disabled);
                })
        );

        it('should enable button for moving to another category when all pages are checked', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(),
                async () => {
                    await new Preferences().load();

                    pageTableDOM.tickAllRowChecks();
                    assert(!pageTableDOM.getRelocatingBtn().disabled);
                })
        );

        it('should disable button when there are no categories to move to', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(),
                async () => {
                    await new Preferences().load();

                    categoryTableDOM.tickAllRowChecks();
                    categoryTableDOM.dispatchClickEvent(categoryTableDOM.getRemovingBtn());

                    pageTableDOM.tickAllRowChecks();
                    assert(pageTableDOM.getRelocatingBtn().disabled);
                })
        );

        const moveToCategory = getCategoryFn => {
            return Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(10),
                async savedInfo => {
                    const preferences = new Preferences();
                    await preferences.load();

                    const pageUrisToMove = pageTableDOM.tickRowCheck(2);
                    const uncheckedCategory = getCategoryFn(
                        [...pageTableDOM.getCategorySelectorList().options]);

                    assert(uncheckedCategory);
                    uncheckedCategory.selected = true;

                    const newCategoryTitle = uncheckedCategory.innerText;

                    const newCategoryPages = PageInfoHelper.getCategoryPages(savedInfo.pageCategories, 
                        newCategoryTitle);
                    assert(pageUrisToMove.every(uri => !newCategoryPages.includes(uri)));

                    pageTableDOM.dispatchClickEvent(pageTableDOM.getRelocatingBtn());
                    pageTableDOM.assertStatusIsEmpty();

                    await preferences.save();

                    newCategoryPages.push(...pageUrisToMove);

                    const storedInfo = await PageInfo.getAllSavedPagesWithCategories();
                    
                    let storedPages;

                    if (CategoryPreferencesDOM.isNoneCategory(newCategoryTitle))
                        storedPages = PageInfoHelper.getUncategorisedPages(storedInfo.pagesInfo, 
                            storedInfo.pageCategories).map(p => p.uri);
                    else
                        storedPages = PageInfoHelper.getCategoryPages(storedInfo.pageCategories, 
                            newCategoryTitle);

                    assert.strictEqual(newCategoryPages.length, storedPages.length);
                    assert(newCategoryPages.every(uri => storedPages.includes(uri)));
                });
        };

        it('should move several pages to another category', () =>
            moveToCategory(options => options.find(op => 
                !CategoryPreferencesDOM.isNoneCategory(op.innerText)))
        );

        it('should uncategorise several pages', () =>
            moveToCategory(options =>
                options.find(op => CategoryPreferencesDOM.isNoneCategory(op.innerText))
            )
        );

        it('should move no pages to a non-existent category but warn', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(5),
                async () => {
                    const preferences = new Preferences();
                    await preferences.load();

                    const pageUrisToMove = pageTableDOM.tickRowCheck(2);

                    pageTableDOM.getCategorySelectorList().value = 
                        '' + Randomiser.getRandomNumberUpToMax();

                    pageTableDOM.dispatchClickEvent(pageTableDOM.getRelocatingBtn());

                    assert(pageTableDOM.assertStatusIsWarning());
                    assert.deepStrictEqual(pageTableDOM.tickRowCheck(2), pageUrisToMove);
                })
        );
    });

    describe('#categoryFilter', function () {

        it('should reveal only existent categories for filtering', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(10, false),
                async () => {
                    await new Preferences().load();

                    const savedCategories = await PageInfo.getAllSavedCategories();

                    const filterCategories = PagePreferencesDOM.getSelectTextOptions(
                        pageTableDOM.getCategoryFilterList())
                        .filter(c => !CategoryPreferencesDOM.isNoneCategory(c));
                    assert.strictEqual(filterCategories.length, savedCategories.length);
                    assert(savedCategories.map(c => c.title)
                        .every(ct => filterCategories.includes(ct)));
                })
        );

        const getOption = (listCtrl, selected) => {
            const selectedOption = [...listCtrl.options].find(op => op.selected == selected);
            assert(selectedOption);

            return selectedOption;
        };

        const assertChosenCategoryFilter = (chosenCategoryTitle, pagesInfo, pageCategories) => {
            const selectedCategory = getOption(pageTableDOM.getCategoryFilterList(), true);
            assert.strictEqual(selectedCategory.innerText, chosenCategoryTitle);

            const chosenPageCategoryPages = PageInfoHelper.getCategoryPages(
                pageCategories, chosenCategoryTitle);
            assert(chosenPageCategoryPages);

            pageTableDOM.assertTableValues(pagesInfo
                .filter(p => chosenPageCategoryPages.includes(p.uri)));
        };

        it('should show pages related to a default category initially', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(10),
                async savedInfo => {
                    await new Preferences().load();

                    const categories = await PageInfo.getAllSavedCategories();                    
                    const defaultCategory = categories.find(c => c.default);
                    assert(defaultCategory);

                    assertChosenCategoryFilter(defaultCategory.title, savedInfo.pagesInfo, 
                        savedInfo.pageCategories);
                })
        );

        const changeFilterCategory = () => {
            const categoryFilter = pageTableDOM.getCategoryFilterList();
            const uncheckedCategory = getOption(categoryFilter, false);
            uncheckedCategory.selected = true;

            pageTableDOM.dispatchChangeEvent(categoryFilter);

            return uncheckedCategory;
        };

        it('should show pages related to a chosen category', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(10, false),
                async savedInfo => {
                    await new Preferences().load();

                    assertChosenCategoryFilter(changeFilterCategory().innerText, savedInfo.pagesInfo, 
                        savedInfo.pageCategories);
                })
        );

        it('should show pages related to the None category if there is no default category', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(10, false),
                async savedInfo => {
                    await new Preferences().load();

                    const selectedCategory = getOption(pageTableDOM.getCategoryFilterList(), true);
                    assert(CategoryPreferencesDOM.isNoneCategory(selectedCategory.innerText));

                    pageTableDOM.assertTableValues(PageInfoHelper.getUncategorisedPages(
                        savedInfo.pagesInfo, savedInfo.pageCategories));
                })
        );

        it('should exclude the current filtering category from those available for relocating', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(5),
                async () => {
                    await new Preferences().load();

                    const filterList = pageTableDOM.getCategoryFilterList();
                    const selectorList = pageTableDOM.getCategorySelectorList();

                    const assertSelectorHasNoFilter = () => {
                        const selectorOptions = [...selectorList.options];
                        const curFilterCategoryTitle = getOption(filterList, true).innerText;

                        assert(!selectorOptions.find(op => op.innerText === curFilterCategoryTitle));
                    };

                    assertSelectorHasNoFilter();                    

                    changeFilterCategory();
                    assertSelectorHasNoFilter();                    
                })
        );
    });

    const preferencesTester = new PreferencesTestHelper(pageTableDOM);

    describe('#remove', function () {

        it('should enable button for removing several pages', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(),
                () => new Preferences().load()
                    .then(() => {
                        pageTableDOM.tickRowCheck(2);
                        assert(!pageTableDOM.getRemovingBtn().disabled);
                    })
            );
        });
    
        it('should enable button for removing when all pages are checked', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(),
                () => new Preferences().load()
                    .then(() => {
                        pageTableDOM.tickAllRowChecks();

                        assert(!pageTableDOM.getRemovingBtn().disabled);
                    })
            );
        });

        it('should remove several pages', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageInfo()
                .then(async expectedPageData => {
                    const removedUris = await preferencesTester.removeFirstTwoRows();

                    const pageInfos = await PageInfo.getAllSavedPagesFullInfo();
                    assert.deepStrictEqual(pageInfos, 
                        expectedPageData.filter(pi => !removedUris.includes(pi.uri)));
                }))
        );
    });
    
    describe('#search', function () {

        it('should filter the results by clicking enter in the respective field', () => 
            Expectation.expectResolution(StorageHelper.saveTestPageInfo(5),
                pagesInfo => preferencesTester.searchByEnterClick(pagesInfo))
        );

        it('should filter the results by changing text in the respective field', () => 
            Expectation.expectResolution(StorageHelper.saveTestPageInfo(5),
                pagesInfo => preferencesTester.searchByInputting(pagesInfo))
        );
    });

    describe('#sort', function () {

        const DATE_FIELD_NAME = 'date';

        it('should sort pages by their dates', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(10),
                pagesInfo => new Preferences().load()
                    .then(() => {
                        const dateHeader = preferencesTester.getFieldHeader(DATE_FIELD_NAME);

                        assert.deepStrictEqual(preferencesTester.sortByLastField(dateHeader),
                            ArrayExtension.sortAsc(pagesInfo, DATE_FIELD_NAME)
                                .map(pi => PagePreferencesDOM.formatDate(pi[DATE_FIELD_NAME])));
                        assert(pageTableDOM.isHeaderSortedAsc(dateHeader));

                        assert.deepStrictEqual(preferencesTester.sortByLastField(dateHeader), 
                            ArrayExtension.sortDesc(pagesInfo, DATE_FIELD_NAME)
                                .map(pi => PagePreferencesDOM.formatDate(pi[DATE_FIELD_NAME])));
                        assert(pageTableDOM.isHeaderSortedDesc(dateHeader));
                    })
            );
        });

        it('should sort filtered rows without changing the data', () => 
            Expectation.expectResolution(StorageHelper.saveTestPageInfo(5),
                async pagesInfo => {
                    await preferencesTester.searchByInputting(pagesInfo);

                    const dateHeader = preferencesTester.getFieldHeader(DATE_FIELD_NAME);
                    preferencesTester.sortByLastField(dateHeader);

                    preferencesTester.assertSearchOutcome();
                })
        );
    });

    describe('#initialiseExport', function () {

        before(() => {
            FileTransfer.configureGlobals();
        });

        const getFileImportBtn = () => document.getElementById(pageTableDOM.sectionId + '--btn-file');

        const getImportBtn = (isUpsertable = false) =>
            [...document.getElementsByClassName(pageTableDOM.sectionId + '--btn-import')].find(btn => {
                const upsertable = btn.dataset.upsertable;
                return isUpsertable ? upsertable === 'true': !upsertable; 
            });

        it('should disable the upsertable import button after loading empty page data', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(0),
                () => new Preferences().load()
                    .then(() => {
                        assert(!getImportBtn().disabled);
                        assert(getImportBtn(true).disabled);
                    })
            );
        });

        it('should load saved page data and enable buttons for import', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(),
                () => new Preferences().load()
                    .then(() => {
                        assert(!getImportBtn().disabled);
                        assert(!getImportBtn(true).disabled);
                    })
            );
        });

        it('should initiate importing by opening a dialog to opt for a package file', () =>
            Expectation.expectResolution(new Preferences().load()
                .then(() => {
                    let fileDialogIsOpen = false;

                    const fileBtn = getFileImportBtn();
                    fileBtn.onclick = () => fileDialogIsOpen = !fileDialogIsOpen;

                    const importBtn = getImportBtn();
                    assert.strictEqual(importBtn.disabled, false);

                    pageTableDOM.dispatchClickEvent(importBtn);

                    assert.strictEqual(fileDialogIsOpen, true);

                    pageTableDOM.assertStatusIsEmpty();
                }))
        );

        const initExportPreferences = async () => {
            const preferences = new Preferences();

            await preferences.load();

            await preferences.initialiseExport();

            return preferences;
        };

        const initExportPreferencesWithPageInfo = async (predeterminedUri = null, storedPagesNumber = 5) =>
            Expectation.expectResolution(
                StorageHelper.saveTestPageInfo(storedPagesNumber, predeterminedUri), 
                async pages => {
                    const preferences = await initExportPreferences();
                    return { pages, preferences };
                });

        it('should import nothing if no import file is chosen', () =>
            initExportPreferencesWithPageInfo().then(() => {
                const fileBtn = getFileImportBtn();
    
                let errorWasThrown = false;
                global.alert = () => errorWasThrown = true;
    
                pageTableDOM.dispatchChangeEvent(fileBtn);

                assert.strictEqual(getImportBtn().disabled, false);
                assert.strictEqual(errorWasThrown, false);

                pageTableDOM.assertStatusIsEmpty();
            })
        );

        it('should alert if an imported package file has a wrong file extension', () =>
            initExportPreferencesWithPageInfo().then(result => {
                const fileBtn = FileTransfer.addFileToInput(getFileImportBtn(), result.pages,
                    Randomiser.getRandomNumberUpToMax() + '.json');
    
                pageTableDOM.dispatchChangeEvent(fileBtn);

                assert.strictEqual(getImportBtn().disabled, false);
                pageTableDOM.assertStatusIsWarning();
            })
        );

        const testImportingWithEmptyPackage = (inputFileContents, resultPackage = null) => {
            const fileBtn = FileTransfer.addFileToInput(getFileImportBtn(), inputFileContents);
            FileTransfer.fileReaderClass.setResultPackage(resultPackage);

            pageTableDOM.dispatchChangeEvent(fileBtn);
            assert.strictEqual(getImportBtn().disabled, false);

            assert.strictEqual(FileTransfer.fileReaderClass.passedBlob.size, 
                fileBtn.files[0].size);

            const expectedError = new PagePackageError(PagePackageError.EMPTY_IMPORT_PACKAGE_TYPE);
            pageTableDOM.assertStatusIsWarning(expectedError.toString());
        };

        it('should throw an exception if an imported package file is empty', () =>
            initExportPreferencesWithPageInfo().then(result => testImportingWithEmptyPackage(result.pages))
        );

        it('should throw an exception if an imported package file contains no pages', () =>
            initExportPreferencesWithPageInfo().then(result => 
                testImportingWithEmptyPackage(result.pages, []))
        );

        const TEST_URI = 'https://github.com/Jahn08/WEB-PAGE-HIGHLIGHTER';
        const IMPORTED_DATA_JSON = fs.readFileSync('./tests/resources/testStorage.hltr')
            .toString('utf8');    

        const fakePromise = (action = null) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        if (action)
                            action();
        
                        resolve();
                    }
                    catch(ex) {
                        reject(ex);
                    }
                }, 100);
            });
        };
            
        const startImporting = async () => {
            FileTransfer.fileReaderClass.setResultPackage(IMPORTED_DATA_JSON);

            const fileBtn = FileTransfer.addFileToInput(getFileImportBtn());
            pageTableDOM.dispatchChangeEvent(fileBtn);

            return fakePromise();
        };

        const testImportingData = async (pagesInfo, shouldUpdateExistentPages, testUri) => {
            const pageToUpdate = pagesInfo.find(pi => pi.uri === testUri);
            assert(pageToUpdate);

            const importBtn = getImportBtn(shouldUpdateExistentPages);
            importBtn.click();

            await startImporting();

            assert.strictEqual(importBtn.disabled, false);

            const categories = (await PageInfo.getAllSavedCategories()) || [];
            
            categoryTableDOM.assertTableValues(categories);

            const categoryOptions = PagePreferencesDOM.getSelectTextOptions(
                pageTableDOM.getCategoryFilterList());
            assert(categories.every(c => categoryOptions.includes(c.title)));

            const storedData = await PageInfo.getAllSavedPagesWithCategories();
            const uncategorisedPages = PageInfoHelper.getUncategorisedPages(storedData.pagesInfo, 
                storedData.pageCategories);
            pageTableDOM.assertTableValues(uncategorisedPages);

            const fullInfo = await PageInfo.getAllSavedPagesFullInfo();

            if (shouldUpdateExistentPages)
                assert.strictEqual(fullInfo.filter(
                    p => p[PageInfo.DIC_SIZE_PROP_NAME] === LZWCompressor.X14_DICTIONARY_SIZE).length, 1);
                
            const importedPages = JSON.parse(IMPORTED_DATA_JSON);

            importedPages.forEach(imp => {
                const savedPage = fullInfo.find(pi => pi.uri === imp.uri);

                const hasDicSizeImported = imp[PageInfo.DIC_SIZE_PROP_NAME] !== undefined;

                if (!hasDicSizeImported)
                    delete savedPage[PageInfo.DIC_SIZE_PROP_NAME];

                if (imp.uri !== pageToUpdate.uri) {
                    assert.deepStrictEqual(savedPage, imp);
                    return;
                }

                if (!hasDicSizeImported)
                    delete pageToUpdate[PageInfo.DIC_SIZE_PROP_NAME];

                if (shouldUpdateExistentPages) {
                    assert.deepStrictEqual(savedPage, imp);
                    assert.notDeepStrictEqual(imp, pageToUpdate);
                }
                else {
                    assert.notDeepStrictEqual(savedPage, imp);
                    assert.deepStrictEqual(savedPage, pageToUpdate);
                }
            });

            const statusMsg = pageTableDOM.assertStatusIsMessage();
            assert(statusMsg);
            assert(statusMsg.endsWith(shouldUpdateExistentPages ? '2' : '1'));
        };

        it('should import all pages from a package file and update current ones', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(5, false, TEST_URI),
                async result => {
                    await initExportPreferences();

                    PageInfoHelper.fillPageCategories(result.pagesInfo, result.pageCategories);

                    await testImportingData(result.pagesInfo, true, TEST_URI);
                })
        );

        const CATEGORISED_PAGE_URI = 'https://ru.wikipedia.org/wiki/%D0%9C%D0%B5%D1%82%D0%B8%D0%B7';
        it('should import all pages from a package file and move a page to the NONE category', () =>
            Expectation.expectResolution(
                StorageHelper.saveTestPageEnvironment(5, false, CATEGORISED_PAGE_URI),
                async result => {
                    await initExportPreferences();

                    PageInfoHelper.fillPageCategories(result.pagesInfo, result.pageCategories);

                    await testImportingData(result.pagesInfo, true, CATEGORISED_PAGE_URI);
                })
        );

        it('should import all pages from a package file without updating current ones', () =>
            Expectation.expectResolution(initExportPreferencesWithPageInfo(CATEGORISED_PAGE_URI), 
                async result => await testImportingData(result.pages, false, CATEGORISED_PAGE_URI))
        );
        
        it('should reinitialise an export button after importing', () =>
            Expectation.expectResolution(initExportPreferencesWithPageInfo(null, 0), async () =>  {
                await startImporting();
                const exportBtn = getExportBtn();

                await fakePromise(() => assert.strictEqual(exportBtn.disabled, false));
            })
        );

        it('should disable the upsertable import button after removing all pages', () =>
            initExportPreferencesWithPageInfo().then(() => {
                pageTableDOM.tickAllRowChecks();

                pageTableDOM.dispatchClickEvent(pageTableDOM.getRemovingBtn());

                assert.strictEqual(getExportBtn().disabled, false);
                assert.strictEqual(getImportBtn(true).disabled, true);
                assert.strictEqual(getImportBtn().disabled, false);
            })
        );

        it('should import a removed page and let it be saved again', () =>
            initExportPreferencesWithPageInfo(TEST_URI).then(async result => {
                pageTableDOM.tickAllRowChecks();

                pageTableDOM.dispatchClickEvent(pageTableDOM.getRemovingBtn());
                await result.preferences.save();

                await startImporting();
                
                const storedInfo = await PageInfo.getAllSavedPagesWithCategories();
                const storedPages = storedInfo.pagesInfo;
                assert.strictEqual(storedPages.length, 2);
                assert.strictEqual(storedPages.filter(p => p.uri === TEST_URI).length, 1);
            })
        );

        const getExportBtn = () => document.getElementById(pageTableDOM.sectionId + '--btn-export');

        it('should initialise export enabling the respective button', () =>
            initExportPreferencesWithPageInfo().then(() => {
                const exportBtn = getExportBtn();
                assert.strictEqual(exportBtn.disabled, false);
            })
        );
        
        it('should leave the export button disabled if there are no pages being stored', () =>
            initExportPreferencesWithPageInfo(null, 0).then(() => {
                const exportBtn = getExportBtn();
                assert.strictEqual(exportBtn.disabled, true);
            })
        );

        it('should enable the Import/Export buttons after removing all pages of a current category', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(10),
                async () => {
                    await initExportPreferences();

                    const pageTableBody = pageTableDOM.getTableBody();
                    pageTableDOM.tickRowCheck(pageTableBody.rows.length);

                    pageTableDOM.dispatchClickEvent(pageTableDOM.getRemovingBtn());
                    assert(!pageTableBody.rows.length);

                    assert(!getExportBtn().disabled);
                    assert(!getImportBtn(true).disabled);
                    assert(!getImportBtn().disabled);
                });
        });

        it('should reject if the page table is not initialised', () =>
            Expectation.expectRejection(new Preferences().initialiseExport(), 
                new PagePackageError(PagePackageError.WRONG_INITIALISATION_TYPE))
        );

        it('should set up an export link when clicking on the export button', () =>
            initExportPreferencesWithPageInfo().then(() => { 
                const exportLink = document.getElementById(pageTableDOM.sectionId + '--link-export');
                assert(exportLink);

                let linkWasClicked = false;
                exportLink.onclick = () => linkWasClicked = !linkWasClicked;

                let expectedUrl;
                URL.createObjectURL = exportPackage => {
                    assert(exportPackage);
                    assert(exportPackage.size);

                    return expectedUrl = Randomiser.getRandomNumberUpToMax();
                };

                let urlWasRevoked = false;
                URL.revokeObjectURL = url => {
                    assert(url);
                    assert.strictEqual(url, expectedUrl);
                    
                    urlWasRevoked = !urlWasRevoked;
                };

                pageTableDOM.dispatchClickEvent(getExportBtn());

                assert.strictEqual(linkWasClicked, true);
                assert.strictEqual(urlWasRevoked, true);

                assert.strictEqual(exportLink.href, '' + expectedUrl);
                assert(exportLink.download.endsWith('.hltr'));
            })
        );
    });
});
