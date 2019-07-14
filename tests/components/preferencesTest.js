import assert from 'assert';
import { EnvLoader } from '../tools/envLoader.js';
import { Randomiser } from '../tools/randomiser';
import { BrowserMocked } from '../tools/browserMocked';
import { Expectation } from '../tools/expectation.js';
import { Preferences } from '../../components/preferences.js';
import { ColourList } from '../../components/colourList.js';

describe('content_script/preferences', function () {
    this.timeout(0);

    const browserMocked = new BrowserMocked();

    beforeEach('loadResources', done => {
        browserMocked.resetBrowserStorage();
        
        EnvLoader.loadDomModel('./views/preferences.html').then(() => done()).catch(done);
    });
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/browserStorage.js', 'BrowserStorage')
            .then(() => EnvLoader.loadClass('./content_scripts/pageInfo.js', 'PageInfo')
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

    const assertPageTableValues = (expectedRowValues = []) => {
        const tableBody = getPageTableBody();

        assert.strictEqual(tableBody.rows.length, expectedRowValues.length);
        const rowContents = [...tableBody.rows].map(r => r.textContent);

        assert(expectedRowValues.every(rv => {
            const date = new Date(rv.date);
            const dateVal = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

            return rowContents.find(rc => 
                rc.indexOf(rv.title) !== -1 && rc.indexOf(dateVal) !== -1) !== null;
        }));
        
        const rowUris = [...tableBody.querySelectorAll('input[type=checkbox]')]
            .map(ch => ch.dataset.uri);

        assert.strictEqual(rowUris.length, expectedRowValues.length);
        assert(expectedRowValues.every(rv => rowUris.includes(rv.uri)));
    };

    describe('#constructor', () => 
     
        it('should create a form with default values', () => {
            new Preferences();

            assertFormValues();
            assertPageTableValues();
        })
    );

    const createTestPageInfo = () => {
        return {
            title: Randomiser.getRandomNumberUpToMax(),
            uri: 'https://test/' + Randomiser.getRandomNumber(10000000),
            date: new Date().setMonth(Randomiser.getRandomNumber(1000))
        };
    };

    const setTestPageInfoToStorage = () => {
        const expectedPageData = [createTestPageInfo(), createTestPageInfo(), 
            createTestPageInfo()];
    
        return Promise.all(expectedPageData.map(pi => new global.BrowserStorage(pi.uri).set(pi)))
            .then(() => { return expectedPageData; });
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
            return Expectation.expectResolution(setTestPageInfoToStorage(),
                (expectedPageData) => new Preferences().load()
                    .then(() => assertPageTableValues(expectedPageData)));
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
            return Expectation.expectResolution(setTestPageInfoToStorage(),
                expectedPageData => {
                    const preferences = new Preferences();
                    
                    return preferences.load(() => preferences.save().then(() =>
                        global.PageInfo.getAllSavedPagesInfo().then(pageInfos =>
                            assert.deepStrictEqual(pageInfos, expectedPageData)
                        )
                    ));
                });
        });

        it('should save the preferences page removing page data', () => {
            return Expectation.expectResolution(setTestPageInfoToStorage()
                .then(async expectedPageData => {
                    const preferences = new Preferences();

                    await preferences.load();

                    const indexForRemoval = Randomiser.getRandomNumber(expectedPageData.length);
                    const rowForRemoval = getPageTableBody().rows.item(indexForRemoval);
                    
                    const rowForRemovalCheck = rowForRemoval.querySelector('input[type=checkbox]');
                    rowForRemovalCheck.checked = true;
                    const uriForRemoval = rowForRemovalCheck.dataset.uri;

                    document.getElementById('form--section-page--btn-remove').dispatchEvent(
                        new Event('click'));

                    await preferences.save();

                    const pageInfos = await global.PageInfo.getAllSavedPagesInfo();
                    
                    assert.deepStrictEqual(pageInfos, 
                        expectedPageData.filter(pi => pi.uri !== uriForRemoval));
                }));
        });
    });
});
