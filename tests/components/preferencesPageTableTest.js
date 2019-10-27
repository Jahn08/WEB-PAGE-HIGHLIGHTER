import assert from 'assert';
import { EnvLoader } from '../tools/envLoader.js';
import { BrowserMocked } from '../tools/browserMocked';
import { Randomiser } from '../tools/randomiser.js';
import { Expectation } from '../tools/expectation.js';
import { Preferences, PagePackageError } from '../../components/preferences.js';
import { PagePreferencesDOM } from '../tools/preferencesDOM.js';
import { PreferencesTestHelper } from '../tools/preferencesTestHelper.js';
import { StorageHelper } from '../tools/storageHelper.js';
import { FileTransfer } from '../tools/fileTransfer.js';
import fs from 'fs';

describe('components/preferences/pageTable', function () {
    this.timeout(0);

    const browserMocked = new BrowserMocked();

    beforeEach('loadResources', done => {
        browserMocked.resetBrowserStorage();

        PagePreferencesDOM.loadDomModel().then(() => done()).catch(done);
    });
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/pageInfo.js', 'PageInfo')
            .then(() => EnvLoader.loadClass('./content_scripts/lzwCompressor.js', 'LZWCompressor')
                .then(() => done()))
            .catch(done);
    });

    afterEach('releaseResources', () => {        
        EnvLoader.unloadDomModel();
    });

    const pageTableDOM = new PagePreferencesDOM();

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
        it('should enable button for moving several pages to another category');

        it('should enable button for moving to another category when all pages are checked');

        it('should disable button when there are no categories to move to');

        it('should move several pages to another category');
    });

    describe('#categoryFilter', function () {
        it('should show pages related to a default category initially');

        it('should show pages related to the None category if there is no default category');

        it('should show pages related to a chosen category');

        it('should exclude the current filtering category from those available for relocating');
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
                        pageTableDOM.tickAllRowsCheck();

                        assert(!pageTableDOM.getRemovingBtn().disabled);
                    })
            );
        });

        it('should remove several pages', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageInfo()
                .then(async expectedPageData => {
                    const removedUris = await preferencesTester.removeSomeRows();

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

        it('should sort pages by their dates', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(10),
                pagesInfo => new Preferences().load()
                    .then(() => {
                        const dateHeader = pageTableDOM.getTableHeaders().filter(h => h.dataset.sortField === 'date')[0];
                        assert(dateHeader);

                        const tableBody = pageTableDOM.getTableBody();

                        const sortDates = () => {
                            pageTableDOM.dispatchClickEvent(dateHeader);
                            
                            return [...tableBody.rows].map(r => r.querySelector('td:nth-last-child(1)').textContent);
                        };

                        const sortField = 'date';
                        assert.deepStrictEqual(sortDates(),
                            ArrayExtension.sortAsc(pagesInfo, sortField)
                                .map(pi => PagePreferencesDOM.formatDate(pi[sortField])));
                        assert(pageTableDOM.isHeaderSortedAsc(dateHeader));

                        assert.deepStrictEqual(sortDates(), 
                            ArrayExtension.sortDesc(pagesInfo, sortField)
                                .map(pi => PagePreferencesDOM.formatDate(pi[sortField])));
                        assert(pageTableDOM.isHeaderSortedDesc(dateHeader));
                    })
            );
        });
    });

    describe('#initialiseExport', function () {

        before(() => {
            FileTransfer.configureGlobals();
        });

        const getAssertedStatusLabel = (expectedMsgNumber = 1) => { 
            const statusSection = document.getElementById('form-section-status');
            assert.strictEqual(statusSection.childNodes.length, expectedMsgNumber);

            return expectedMsgNumber ? statusSection.childNodes.item(0) : null;
        };

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

        const assertStatusIsEmpty = () => assert(!getAssertedStatusLabel(0));

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

                    assertStatusIsEmpty();
                }))
        );

        it('should import nothing if no import file is chosen', () =>
            initPreferencesWithExport().then(() => {
                const fileBtn = getFileImportBtn();
    
                let errorWasThrown = false;
                global.alert = () => errorWasThrown = true;
    
                pageTableDOM.dispatchChangeEvent(fileBtn);

                assert.strictEqual(getImportBtn().disabled, false);
                assert.strictEqual(errorWasThrown, false);

                assertStatusIsEmpty();
            })
        );

        const STATUS_WARNING_CLASS = 'form-section-status--label-warning';

        const assertStatusIsWarning = (expectedSubstring = null) => {
            const statusLabel = getAssertedStatusLabel();

            const warning = statusLabel.innerText;
            assert(warning);
            assert(statusLabel.classList.contains(STATUS_WARNING_CLASS));

            if (expectedSubstring)
                assert(warning.includes(expectedSubstring));
        };

        it('should alert if an imported package file has a wrong file extension', () =>
            initPreferencesWithExport().then(result => {
                const fileBtn = FileTransfer.addFileToInput(getFileImportBtn(), result.pages,
                    Randomiser.getRandomNumberUpToMax() + '.json');
    
                pageTableDOM.dispatchChangeEvent(fileBtn);

                assert.strictEqual(getImportBtn().disabled, false);
                assertStatusIsWarning();
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
            assertStatusIsWarning(expectedError.toString());
        };

        it('should throw an exception if an imported package file is empty', () =>
            initPreferencesWithExport().then(result => testImportingWithEmptyPackage(result.pages))
        );

        it('should throw an exception if an imported package file contains no pages', () =>
            initPreferencesWithExport().then(result => 
                testImportingWithEmptyPackage(result.pages, []))
        );

        const TEST_URI = 'https://github.com/Jahn08/WEB-PAGE-HIGHLIGHTER';
        const IMPORTED_DATA_JSON = fs.readFileSync('./tests/resources/testStorage.hltr')
            .toString('utf8');    

        const startImporting = () => {
            FileTransfer.fileReaderClass.setResultPackage(IMPORTED_DATA_JSON);

            const fileBtn = FileTransfer.addFileToInput(getFileImportBtn());
            pageTableDOM.dispatchChangeEvent(fileBtn);
        };

        const testImportingData = async (pagesInfo, shouldUpdateExistentPages = true) => {
            const pageToUpdate = pagesInfo.find(pi => pi.uri === TEST_URI);
            assert(pageToUpdate);

            const importBtn = getImportBtn(shouldUpdateExistentPages);
            importBtn.click();

            startImporting();

            assert.strictEqual(importBtn.disabled, false);

            const fullInfo = await PageInfo.getAllSavedPagesFullInfo();
            pageTableDOM.assertTableValues(fullInfo);
            
            const importedPages = JSON.parse(IMPORTED_DATA_JSON);
                
            importedPages.forEach(imp => {
                const savedPage = fullInfo.find(pi => pi.uri === imp.uri);

                if (imp.uri !== pageToUpdate.uri) {
                    assert.deepStrictEqual(savedPage, imp);
                    return;
                }

                if (shouldUpdateExistentPages) {
                    assert.deepStrictEqual(savedPage, imp);
                    assert.notDeepStrictEqual(imp, pageToUpdate);
                }
                else {
                    assert.notDeepStrictEqual(savedPage, imp);
                    assert.deepStrictEqual(savedPage, pageToUpdate);
                }
            });

            const statusLabel = getAssertedStatusLabel();
    
            const statusMsg = statusLabel.innerText;
            assert(statusMsg);
            assert(statusMsg.endsWith(shouldUpdateExistentPages ? '1' : '0'));

            assert(!statusLabel.classList.contains(STATUS_WARNING_CLASS));
        };

        it('should import all pages from a package file and update current ones', () =>
            initPreferencesWithExport(TEST_URI).then(result => testImportingData(result.pages))
        );

        it('should import all pages from a package file without updating current ones', () =>
            initPreferencesWithExport(TEST_URI)
                .then(result => testImportingData(result.pages, false))
        );
        
        it('should reinitialise an export button after importing', () =>
            initPreferencesWithExport(null, 0).then(() =>  {
                startImporting();
                const exportBtn = getExportBtn();

                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        try {
                            assert.strictEqual(exportBtn.disabled, false);
                            resolve();
                        }
                        catch(ex) {
                            reject(ex);
                        }
                    }, 100);
                });
            })
        );

        it('should disable export and upsertable import buttons after removing all pages', () =>
            initPreferencesWithExport().then(() => {
                pageTableDOM.tickAllRowsCheck();

                pageTableDOM.dispatchClickEvent(pageTableDOM.getRemovingBtn());

                assert.strictEqual(getExportBtn().disabled, true);
                assert.strictEqual(getImportBtn(true).disabled, true);
                assert.strictEqual(getImportBtn().disabled, false);
            })
        );

        it('should import a removed page and let it be saved again', () =>
            initPreferencesWithExport(TEST_URI).then(async result => {
                pageTableDOM.tickAllRowsCheck();

                pageTableDOM.dispatchClickEvent(pageTableDOM.getRemovingBtn());
                await result.preferences.save();

                startImporting();
                
                const storedInfo = await PageInfo.getAllSavedPagesInfo();
                const storedPages = storedInfo.pagesInfo;
                assert.strictEqual(storedPages.length, 1);
                assert.strictEqual(storedPages[0].uri, TEST_URI);
            })
        );

        const initPreferencesWithExport = async (predeterminedUri = null, storedPagesNumber = 5) =>
            Expectation.expectResolution(
                StorageHelper.saveTestPageInfo(storedPagesNumber, predeterminedUri), 
                async pages => {
                    const preferences = new Preferences();

                    await preferences.load();

                    await preferences.initialiseExport();

                    return { pages, preferences };
                });

        const getExportBtn = () => document.getElementById(pageTableDOM.sectionId + '--btn-export');

        it('should initialise export enabling the respective button', () =>
            initPreferencesWithExport().then(() => {
                const exportBtn = getExportBtn();
                assert.strictEqual(exportBtn.disabled, false);
            })
        );
        
        it('should leave the export button disabled if there are no pages being stored', () =>
            initPreferencesWithExport(null, 0).then(() => {
                const exportBtn = getExportBtn();
                assert.strictEqual(exportBtn.disabled, true);
            })
        );

        it('should reject if the page table is not initialised', () =>
            Expectation.expectRejection(new Preferences().initialiseExport(), 
                new PagePackageError(PagePackageError.WRONG_INITIALISATION_TYPE))
        );

        it('should set up an export link when clicking on the export button', () =>
            initPreferencesWithExport().then(() => { 
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
