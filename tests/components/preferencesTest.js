import assert from 'assert';
import { EnvLoader } from '../tools/envLoader.js';
import { Randomiser } from '../tools/randomiser';
import { BrowserMocked } from '../tools/browserMocked';
import { Expectation } from '../tools/expectation.js';
import { FileTransfer } from '../tools/fileTransfer.js';
import { Preferences, RepeatInitError, PagePackageError } from '../../components/preferences.js';
import { ColourList } from '../../components/colourList.js';
import { StorageHelper } from '../tools/storageHelper.js';
import fs from 'fs';

describe('components/preferences', function () {
    this.timeout(0);

    const browserMocked = new BrowserMocked();

    beforeEach('loadResources', done => {
        browserMocked.resetBrowserStorage();
        
        EnvLoader.loadDomModel('./views/preferences.html').then(() => done()).catch(done);
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

    const getWarnCheck = () => document.getElementById('form--check-warning');

    const getLoadCheck = () => document.getElementById('form--check-loading');

    const getColourRadios = () => [...document.querySelectorAll('input[type=\'radio\']')];

    const assertFormValues = (expectedColourToken = null, expectedWarnCheck = true,
        expectedLoadCheck = false) => {
        const colourDivs = getColourRadios();
        
        const colourTokens = colourDivs.map(d => d.value);
        assert(ColourList.colours.every(c => colourTokens.includes(c.token)));
    
        assert.strictEqual(colourDivs.filter(d => d.checked).length, 1);
        assert((expectedColourToken ? colourDivs.find(d => d.value === expectedColourToken) : 
            colourDivs[0]).checked);

        const shouldWarnCheck = getWarnCheck();
        assert(shouldWarnCheck);
        assert.strictEqual(shouldWarnCheck.checked, expectedWarnCheck);

        const shouldLoadCheck = getLoadCheck();
        assert(shouldLoadCheck);
        assert.strictEqual(shouldLoadCheck.checked, expectedLoadCheck);
    };

    const getPageTableBody = () => {
        const table = document.getElementById('form--table-pages');
        assert(table);

        assert(table.tHead);
        assert.strictEqual(table.tBodies.length, 1);

        return table.tBodies[0];
    };

    const formatDate = (ticks) => {
        const date = new Date(ticks);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    };

    const assertPageTableValues = (expectedRowValues = []) => {
        const tableBody = getPageTableBody();

        assert.strictEqual(tableBody.rows.length, expectedRowValues.length);
        const rowContents = [...tableBody.rows].map(r => r.textContent);

        assert(expectedRowValues.every(rv => rowContents.find(rc => 
            rc.indexOf(rv.title) !== -1 && rc.indexOf(formatDate(rv.date)) !== -1) !== null
        ));
        
        const rowUris = [...tableBody.querySelectorAll('input[type=checkbox]')]
            .map(ch => ch.dataset.uri);

        assert.strictEqual(rowUris.length, expectedRowValues.length);
        assert(expectedRowValues.every(rv => rowUris.includes(rv.uri)));
    };

    const createClickEvent = () => new Event('click');

    const createChangeEvent = () => new Event('change');

    describe('#constructor', function () { 
     
        it('should create a form with default values', () => {
            new Preferences();

            assertFormValues();
            assertPageTableValues();
        });

        it('should throw an error when trying to render the page twice', () => {
            new Preferences();
            Expectation.expectError(() => new Preferences(), new RepeatInitError());
        });
    });

    const tickPageInfoCheck = (tickNumber = 1) => {
        const rows = getPageTableBody().rows;

        const selectedRows = [];

        if (rows === 1)
            selectedRows.push(rows.item(Randomiser.getRandomNumber(rows.length)));
        else
            for (let i = 0; i < tickNumber && i < rows.length; ++i)
                selectedRows.push(rows.item(i));
        
        return selectedRows.map(r => {
            const rowCheck = r.querySelector('input[type=checkbox]');
            rowCheck.checked = true;

            rowCheck.dispatchEvent(createChangeEvent());
            return rowCheck.dataset.uri;
        });
    };

    describe('#load', function () {

        it('should create the preferences form with default values when there is nothing in the storage', () =>
            Expectation.expectResolution(new Preferences().load(), 
                () => {
                    assertFormValues();
                    assertPageTableValues();
                })
        );

        it('should throw an error when trying to load the page twice', () =>
            Expectation.expectRejection(new Preferences().load().then(() => new Preferences().load()),
                new RepeatInitError())
        );

        it('should load preferences from the storage and update the form', () => {
            const colourInfos = ColourList.colours;
            
            const expectedValues = { 
                shouldWarn: Randomiser.getRandomBoolean(),
                shouldLoad: Randomiser.getRandomBoolean(),
                defaultColourToken: Randomiser.getRandomArrayItem(colourInfos).token
            };

            new BrowserStorage(Preferences.STORAGE_KEY).set(expectedValues);

            return Expectation.expectResolution(new Preferences().load(), 
                () => assertFormValues(expectedValues.defaultColourToken, expectedValues.shouldWarn, 
                    expectedValues.shouldLoad));
        });

        it('should load saved page data from the storage and update the form', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(),
                (expectedPageData) => new Preferences().load()
                    .then(() => assertPageTableValues(expectedPageData)));
        });

        const getShowingUriBtn = () => document.getElementById('form--section-page--btn-show');

        it('should load saved page data and open its uri as loadable', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(),
                () => new Preferences().load()
                    .then(() => {
                        const uriForShowing = tickPageInfoCheck()[0];
                        
                        return new Promise(resolve => {
                            window.open = (uri, target) => {
                                assert.strictEqual(target, '_blank');
                                assert(uri.startsWith(uriForShowing));
                                
                                assert.strictEqual(PageInfo.generateLoadingUrl(uriForShowing), 
                                    uri);
                                resolve();
                            };

                            const btn = getShowingUriBtn();
                            assert(!btn.disabled);
                            
                            btn.dispatchEvent(createClickEvent());
                        });
                    })
            );
        });

        it('should load saved page data and disable button for showing several uris', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(),
                () => new Preferences().load()
                    .then(() => {
                        tickPageInfoCheck(2);
                        assert(getShowingUriBtn().disabled);
                    })
            );
        });
        
        it('should load saved page data and filter the results afterwards', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(5),
                pagesInfo => new Preferences().load()
                    .then(() => {
                        const searchField = document.getElementById('form--section-page--txt-search');
                        assert(searchField);
                        
                        const pageInfoToFind = Randomiser.getRandomArrayItem(pagesInfo);
                        
                        const titleToSearch = '' + pageInfoToFind.title;
                        const textToSearch = titleToSearch.substring(titleToSearch.length - titleToSearch.length / 2);
                        
                        searchField.value = textToSearch;
                        searchField.dispatchEvent(createChangeEvent());

                        const tableBody = getPageTableBody();

                        const targetText = textToSearch.toUpperCase();

                        assert([...tableBody.rows].filter(r => !r.textContent.toUpperCase().includes(targetText))
                            .every(r => r.classList.contains('form--table-pages--row-hidden')));
                    })
            );
        });

        it('should load saved page data and sort the results by date afterwards', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(10),
                pagesInfo => new Preferences().load()
                    .then(() => {
                        const headerClassName = 'form--table-pages--cell-header';
                        
                        const dateHeader = [...document.getElementsByClassName(headerClassName)]
                            .filter(h => h.dataset.sortField === 'date')[0];
                        assert(dateHeader);

                        const tableBody = getPageTableBody();

                        const sortDates = () => {
                            dateHeader.dispatchEvent(createClickEvent());
                            
                            return [...tableBody.rows].map(r => r.querySelector('td:nth-last-child(1)').textContent);
                        };

                        assert.deepStrictEqual(sortDates(), pagesInfo.sort(pi => pi.date)
                            .sort((a, b) => a.date > b.date ? 1 : (a.date < b.date ? -1 : 0))
                            .map(pi => formatDate(pi.date)));
                        assert(dateHeader.classList.contains(headerClassName + '-asc'));

                        assert.deepStrictEqual(sortDates(), pagesInfo.sort(pi => pi.date)
                            .sort((a, b) => b.date > a.date ? 1 : (b.date < a.date ? -1 : 0))
                            .map(pi => formatDate(pi.date)));
                        assert(dateHeader.classList.contains(headerClassName + '-desc'));
                    })
            );
        });
    });

    describe('#save', function () {

        it('should save the preferences form values in the storage', () => {
            const preferences = new Preferences();
            
            const colourRadios = getColourRadios();
            colourRadios.find(r => r.checked).checked = false;

            const expectedColourRadio = Randomiser.getRandomArrayItem(colourRadios);
            expectedColourRadio.checked = true;

            const expectedWarnCheck = Randomiser.getRandomBoolean();
            getWarnCheck().checked = expectedWarnCheck;
            
            const expectedLoadCheck = Randomiser.getRandomBoolean();
            getLoadCheck().checked = expectedLoadCheck;

            return Expectation.expectResolution(preferences.save(), 
                () => {
                    return Preferences.loadFromStorage().then(loadedForm => {
                        assert(loadedForm);

                        assert.strictEqual(loadedForm.shouldLoad, expectedLoadCheck);
                        assert.strictEqual(loadedForm.shouldWarn, expectedWarnCheck);
                        assert.strictEqual(loadedForm.defaultColourToken, expectedColourRadio.value);
                    });
                });
        });

        it('should save the preferences page without removing page data', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(),
                expectedPageData => {
                    const preferences = new Preferences();
                    
                    return preferences.load(() => preferences.save().then(() =>
                        PageInfo.getAllSavedPagesInfo().then(pageInfos =>
                            assert.deepStrictEqual(pageInfos, expectedPageData)
                        )
                    ));
                });
        });

        const getRemovingPageInfoBtn = () => 
            document.getElementById('form--section-page--btn-remove');
            
        it('should save the preferences page removing several pages', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageInfo()
                .then(async expectedPageData => {
                    const preferences = new Preferences();

                    await preferences.load();

                    const urisForRemoval = tickPageInfoCheck(2);

                    const btn = getRemovingPageInfoBtn();
                    assert(!btn.disabled);
                    btn.dispatchEvent(createClickEvent());

                    await preferences.save();

                    const pageInfos = await PageInfo.getAllSavedPagesFullInfo();
                    assert.deepStrictEqual(pageInfos, 
                        expectedPageData.filter(pi => !urisForRemoval.includes(pi.uri)));
                }))
        );
    });

    describe('#initialiseExport', function () {

        before(() => {
            FileTransfer.configureGlobals();
        });

        const getExportBtn = () => document.getElementById('form--section-page--btn-export');

        const initPreferencesWithExport = async (predeterminedUri = null, storedPagesNumber = 5) =>
            Expectation.expectResolution(
                StorageHelper.saveTestPageInfo(storedPagesNumber, predeterminedUri), 
                async pagesInfo => {
                    const preferences = new Preferences();

                    await preferences.load();

                    await preferences.initialiseExport();

                    return pagesInfo;
                });

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
                const exportLink = document.getElementById(
                    'form--section-page--link-export');
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

                const btn = getExportBtn();
                btn.dispatchEvent(createClickEvent());

                assert.strictEqual(linkWasClicked, true);
                assert.strictEqual(urlWasRevoked, true);

                assert.strictEqual(exportLink.href, '' + expectedUrl);
                assert(exportLink.download.endsWith('.hltr'));
            })
        );
        
        const getImportBtn = (isUpsertable = false) =>
            [...document.getElementsByClassName('form--section-page--btn-import')].find(btn => {
                const upsertable = btn.dataset.upsertable;
                return isUpsertable ? upsertable === 'true': !upsertable; 
            });

        const getFileImportBtn = () => document.getElementById('form--section-page--btn-file');

        const getAssertedStatusLabel = (expectedMsgNumber = 1) => { 
            const statusSection = document.getElementById('form-section-status');
            assert.strictEqual(statusSection.childNodes.length, expectedMsgNumber);

            return expectedMsgNumber ? statusSection.childNodes.item(0) : null;
        };

        const assertStatusIsEmpty = () => assert(!getAssertedStatusLabel(0));

        it('should initiate importing by opening a dialog to opt for a package file', () =>
            Expectation.expectResolution(new Preferences().load()
                .then(() => {
                    let fileDialogIsOpen = false;

                    const fileBtn = getFileImportBtn();
                    fileBtn.onclick = () => fileDialogIsOpen = !fileDialogIsOpen;

                    const importBtn = getImportBtn();
                    assert.strictEqual(importBtn.disabled, false);

                    importBtn.dispatchEvent(createClickEvent());

                    assert.strictEqual(fileDialogIsOpen, true);

                    assertStatusIsEmpty();
                }))
        );

        it('should import nothing if no import file is chosen', () =>
            initPreferencesWithExport().then(() => {
                const fileBtn = getFileImportBtn();
    
                let errorWasThrown = false;
                global.alert = () => errorWasThrown = true;
    
                fileBtn.dispatchEvent(createChangeEvent());

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
            initPreferencesWithExport().then(pagesInfo => {
                const fileBtn = FileTransfer.addFileToInput(getFileImportBtn(), pagesInfo,
                    Randomiser.getRandomNumberUpToMax() + '.json');
    
                fileBtn.dispatchEvent(createChangeEvent());

                assert.strictEqual(getImportBtn().disabled, false);
                assertStatusIsWarning();
            })
        );

        const testImportingWithEmptyPackage = (inputFileContents, resultPackage = null) => {
            const fileBtn = FileTransfer.addFileToInput(getFileImportBtn(), inputFileContents);
            FileTransfer.fileReaderClass.setResultPackage(resultPackage);

            fileBtn.dispatchEvent(createChangeEvent());
            assert.strictEqual(getImportBtn().disabled, false);

            assert.strictEqual(FileTransfer.fileReaderClass.passedBlob.size, 
                fileBtn.files[0].size);

            const expectedError = new PagePackageError(PagePackageError.EMPTY_IMPORT_PACKAGE_TYPE);
            assertStatusIsWarning(expectedError.toString());
        };

        it('should throw an exception if an imported package file is empty', () =>
            initPreferencesWithExport().then(pagesInfo => testImportingWithEmptyPackage(pagesInfo))
        );

        it('should throw an exception if an imported package file contains no pages', () =>
            initPreferencesWithExport().then(pagesInfo => 
                testImportingWithEmptyPackage(pagesInfo, []))
        );

        const TEST_URI = 'https://github.com/Jahn08/WEB-PAGE-HIGHLIGHTER';
        const IMPORTED_DATA_JSON = fs.readFileSync('./tests/resources/testStorage.hltr')
            .toString('utf8');    

        const startImporting = () => {
            FileTransfer.fileReaderClass.setResultPackage(IMPORTED_DATA_JSON);

            const fileBtn = FileTransfer.addFileToInput(getFileImportBtn());
            fileBtn.dispatchEvent(createChangeEvent());
        };

        const testImportingData = async (pagesInfo, shouldUpdateExistentPages = true) => {
            const pageToUpdate = pagesInfo.find(pi => pi.uri === TEST_URI);
            assert(pageToUpdate);

            const importBtn = getImportBtn(shouldUpdateExistentPages);
            importBtn.click();

            startImporting();

            assert.strictEqual(importBtn.disabled, false);

            const fullInfo = await PageInfo.getAllSavedPagesFullInfo();
            assertPageTableValues(fullInfo);
            
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
            initPreferencesWithExport(TEST_URI).then(testImportingData)
        );

        it('should import all pages from a package file without updating current ones', () =>
            initPreferencesWithExport(TEST_URI)
                .then(pagesInfo => testImportingData(pagesInfo, false))
        );
        
        it('should reinitialise an export button after importing', () => {
            initPreferencesWithExport(null, 0)
                .then(() =>  {
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
                });
        });
    });
});
