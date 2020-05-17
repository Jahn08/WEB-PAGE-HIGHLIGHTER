import assert from 'assert';
import { EnvLoader } from '../tools/envLoader.js';
import { Randomiser } from '../tools/randomiser.js';
import { BrowserMocked } from '../tools/browserMocked';
import { Expectation } from '../tools/expectation.js';
import { Preferences } from '../../components/preferences.js';
import { ColourList } from '../../components/colourList.js';
import { StorageHelper } from '../tools/storageHelper.js';
import { PagePreferencesDOM, CategoryPreferencesDOM, ShortcutPreferencesDOM } 
    from '../tools/preferencesDOM.js';

describe('components/preferences', function () {
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

    const pageTableDOM = new PagePreferencesDOM();
    const categoryTableDOM = new CategoryPreferencesDOM();
    const shortcutDom = new ShortcutPreferencesDOM();

    const assertSuccessfulLoading = () => {
        assertFormValues();

        pageTableDOM.assertTableValues();
        categoryTableDOM.assertTableValues();
    };

    describe('#constructor', function () { 
     
        it('should create a form with default values', () => {
            new Preferences();

            assertSuccessfulLoading();
        });
    });

    describe('#load', function () { 
        it('should create the preferences form with default values when there is nothing in the storage', () =>
            Expectation.expectResolution(new Preferences().load(), assertSuccessfulLoading)
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

        it('should load saved shortcuts from the storage and update the form', () => {
            return Expectation.expectResolution(StorageHelper.saveTestShortcuts(),
                async expectedShortcuts => {
                    await new Preferences().load();
                    
                    const commandSelector = shortcutDom.getCommandSelector();
                    const renderedOptions = [...commandSelector.options];

                    const commandInput = shortcutDom.getCommandInput();

                    assert(Object.keys(expectedShortcuts).every(sk => 
                        renderedOptions.find(op => op.value === sk) !== null));

                    renderedOptions.forEach(op => {
                        commandSelector.value = op.value;
                        shortcutDom.dispatchChangeEvent(commandSelector);

                        const shortcut = expectedShortcuts[op.value];
                        assert.strictEqual(commandInput.value, shortcut ? shortcut.key : '');
                    });
                });
        });

        it('should load saved page data from the storage and update the table', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageInfo(),
                expectedPageData => new Preferences().load()
                    .then(() => pageTableDOM.assertTableValues(expectedPageData)));
        });

        it('should load saved page categories from the storage and update the table', () => {
            return Expectation.expectResolution(StorageHelper.saveTestCategories(),
                expectedCategoryData => new Preferences().load()
                    .then(() => categoryTableDOM.assertTableValues(expectedCategoryData)));
        });
    });

    describe('#save', function () {

        it('should save the preferences form values to the storage', () => {
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

        it('should save shortcuts to the storage', () => {
            const preferences = new Preferences();
            
            const commandSelector = shortcutDom.getCommandSelector();
            const commandOptions = commandSelector.options;
            const firstCommand = commandSelector.item(0);
            const secondCommand = commandSelector.item(commandOptions.length - 1);

            const commandInput = shortcutDom.getCommandInput();
            shortcutDom.dispatchAndApplyCombination(commandInput);
            
            const firstCombination = commandInput.value;

            commandSelector.value = secondCommand.value;
            shortcutDom.dispatchChangeEvent(commandSelector);
            shortcutDom.dispatchAndApplyCombination(commandInput);

            const secondCombination = commandInput.value;

            return Expectation.expectResolution(preferences.save(), 
                () => {
                    return Preferences.loadFromStorage().then(loadedForm => {
                        assert(loadedForm);
                        assert(loadedForm.shortcuts);

                        const firstShortcut = loadedForm.shortcuts[firstCommand.value];
                        assert(firstShortcut);
                        assert.strictEqual(firstShortcut.key, firstCombination);

                        const secondShortcut = loadedForm.shortcuts[secondCommand.value];
                        assert(secondShortcut);
                        assert.strictEqual(secondShortcut.key, secondCombination);
                    });
                });
        });

        it('should save the preferences page without changing any data', () => {
            return Expectation.expectResolution(StorageHelper.saveTestPageEnvironment(),
                async expectedPageData => {
                    const preferences = new Preferences();
                    
                    const savedCategories = await PageInfo.getAllSavedCategories();

                    await preferences.load();
                    
                    await preferences.save();

                    const fullPagesInfo = await PageInfo.getAllSavedPagesFullInfo();
                    fullPagesInfo.forEach(pi => delete pi.category);
                    assert.deepStrictEqual(fullPagesInfo, expectedPageData.pagesInfo);

                    const storedPageCategories = await PageInfo.getAllSavedPagesWithCategories();
                    
                    assert.deepStrictEqual(storedPageCategories.pageCategories, 
                        expectedPageData.pageCategories);

                    const storedCategories = await PageInfo.getAllSavedCategories();
                    assert.deepStrictEqual(storedCategories, savedCategories);
                });
        });
    });
});
