import assert from 'assert';
import { EnvLoader } from '../tools/envLoader.js';
import { Randomiser } from '../tools/randomiser';
import { BrowserMocked } from '../tools/browserMocked';
import { Expectation } from '../tools/expectation.js';
import { Preferences } from '../../components/preferences.js';
import { ColourList } from '../../components/colourList.js';
import { PageInfoHelper } from '../tools/pageInfoHelper.js';

describe('content_script/preferences', function () {
    this.timeout(0);

    const browserMocked = new BrowserMocked();

    beforeEach('loadResources', done => {
        browserMocked.resetBrowserStorage();
        
        EnvLoader.loadDomModel('./views/preferences.html').then(() => done()).catch(done);
    });
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/pageInfo.js', 'PageInfo')
            .then(() => done())
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

    describe('#constructor', () => 
     
        it('should create a form with default values', () => {
            new Preferences();

            assertFormValues();
            assertPageTableValues();
        })
    );

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

        it('should load preferences from the storage and update the form', () => {
            const colourInfos = ColourList.colours;
            
            const expectedValues = { 
                shouldWarn: Randomiser.getRandomBoolean(),
                shouldLoad: Randomiser.getRandomBoolean(),
                defaultColourToken: colourInfos[Randomiser.getRandomNumber(colourInfos.length - 1)].token
            };

            new global.BrowserStorage(Preferences.STORAGE_KEY).set(expectedValues);

            return Expectation.expectResolution(new Preferences().load(), 
                () => assertFormValues(expectedValues.defaultColourToken, expectedValues.shouldWarn, 
                    expectedValues.shouldLoad));
        });

        it('should load saved page data from the storage and update the form', () => {
            return Expectation.expectResolution(PageInfoHelper.setTestPageInfoToStorage(),
                (expectedPageData) => new Preferences().load()
                    .then(() => assertPageTableValues(expectedPageData)));
        });

        const getShowingUriBtn = () => document.getElementById('form--section-page--btn-show');

        it('should load saved page data and open its uri as loadable', () => {
            return Expectation.expectResolution(PageInfoHelper.setTestPageInfoToStorage(),
                () => new Preferences().load()
                    .then(() => {
                        const uriForShowing = tickPageInfoCheck()[0];
                        
                        return new Promise(resolve => {
                            window.open = (uri, target) => {
                                assert.strictEqual(target, '_blank');
                                assert(uri.startsWith(uriForShowing));
                                
                                assert.strictEqual(global.PageInfo.generateLoadingUrl(uriForShowing), 
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
            return Expectation.expectResolution(PageInfoHelper.setTestPageInfoToStorage(),
                () => new Preferences().load()
                    .then(() => {
                        tickPageInfoCheck(2);
                        assert(getShowingUriBtn().disabled);
                    })
            );
        });
        
        it('should load saved page data and filter the results afterwards', () => {
            return Expectation.expectResolution(PageInfoHelper.setTestPageInfoToStorage(5),
                pagesInfo => new Preferences().load()
                    .then(() => {
                        const searchField = document.getElementById('form--section-page--txt-search');
                        assert(searchField);
                        
                        const pageInfoToFind = pagesInfo[Randomiser.getRandomNumber(pagesInfo.length)];
                        
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
            return Expectation.expectResolution(PageInfoHelper.setTestPageInfoToStorage(10),
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

                        assert.deepStrictEqual(sortDates(), pagesInfo.map(pi => formatDate(pi.date)).sort());
                        assert(dateHeader.classList.contains(headerClassName + '-asc'));

                        assert.deepStrictEqual(sortDates(), 
                            pagesInfo.map(pi => formatDate(pi.date)).sort((a, b) => b > a ? 1 : (b < a ? -1 : 0)))
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

            const expectedColourRadio = colourRadios[Randomiser.getRandomNumber(colourRadios.length - 1)];
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
            return Expectation.expectResolution(PageInfoHelper.setTestPageInfoToStorage(),
                expectedPageData => {
                    const preferences = new Preferences();
                    
                    return preferences.load(() => preferences.save().then(() =>
                        global.PageInfo.getAllSavedPagesInfo().then(pageInfos =>
                            assert.deepStrictEqual(pageInfos, expectedPageData)
                        )
                    ));
                });
        });

        const getRemovingPageInfoBtn = () => 
            document.getElementById('form--section-page--btn-remove');
            
        it('should save the preferences page removing several pages', () => {
            return Expectation.expectResolution(PageInfoHelper.setTestPageInfoToStorage()
                .then(async expectedPageData => {
                    const preferences = new Preferences();

                    await preferences.load();

                    const urisForRemoval = tickPageInfoCheck(2);

                    const btn = getRemovingPageInfoBtn();
                    assert(!btn.disabled);
                    btn.dispatchEvent(createClickEvent());

                    await preferences.save();

                    const pageInfos = await global.PageInfo.getAllSavedPagesInfo();
                    
                    assert.deepStrictEqual(pageInfos, 
                        expectedPageData.filter(pi => !urisForRemoval.includes(pi.uri)));
                }));
        });
    });
});
