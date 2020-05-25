import assert from 'assert';
import { EnvLoader } from '../tools/envLoader.js';
import { BrowserMocked } from '../tools/browserMocked';
import { ShortcutPreferencesDOM } from '../tools/preferencesDOM.js';
import { Expectation } from '../tools/expectation.js';
import { StorageHelper } from '../tools/storageHelper.js';
import { Preferences } from '../../components/preferences.js';

describe('components/preferences/pageTable', function () {
    this.timeout(0);

    const browserMocked = new BrowserMocked();

    beforeEach('loadResources', done => {
        browserMocked.resetBrowserStorage();

        ShortcutPreferencesDOM.loadDomModel().then(() => done()).catch(done);
    });
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/pageInfo.js', 'PageInfo')
            .then(() => done()).catch(done);
    });

    afterEach('releaseResources', () => {        
        EnvLoader.unloadDomModel();
    });

    const shortcutDom = new ShortcutPreferencesDOM();

    describe('#constructor', function () {
        it('should render all commands available for entering shortcuts', () =>
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(100),
                async expectedShortcuts => {
                    await new Preferences().load();
                    const renderedOptions = [...shortcutDom.getCommandSelector().options];

                    assert(Object.keys(expectedShortcuts).every(sk => 
                        renderedOptions.find(op => op.value === sk) !== null));
                }));
        
        it('should disable the apply button by default', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(),
                async () => {
                    await new Preferences().load();

                    assert(shortcutDom.getApplyButton().disabled);
                }));

        it('should disable the clear button if there is no shortcut for a selected command', () =>
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(),
                async expectedShortcuts => {
                    await new Preferences().load();

                    const selector = shortcutDom.getCommandSelector();
                    selector.value = [...selector.options]
                        .find(op => !expectedShortcuts[op.value]).value;
                    shortcutDom.dispatchChangeEvent(selector);
            
                    assert(!shortcutDom.getCommandInput().value);
                    assert(shortcutDom.getClearButton().disabled);
                }));
   
        it('should enable the clear button if there is a shortcut for a selected command', () =>
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(),
                async () => {
                    await new Preferences().load();

                    assert(shortcutDom.getCommandInput().value);
                    assert(!shortcutDom.getClearButton().disabled);
                }));
    });

    const enterShortcutInUse = async (preferences, shouldApply = false) => {
        await preferences.load();

        const shortcutInUse = shortcutDom.getCommandInput().value;

        const selector = shortcutDom.getCommandSelector();
        selector.value = selector.options[selector.options.length - 1].value;
        shortcutDom.dispatchChangeEvent(selector);

        shortcutDom.dispatchCombination(shouldApply,
            ...ShortcutPreferencesDOM.createKeyboardEventOptions(shortcutInUse));

        return { 
            commandInUse: selector.options[0].value, 
            shortcutInUse 
        };
    };

    const assertReminderInfoMessage = () => shortcutDom.assertStatusIsMessage('appl');

    describe('#input', function () {
        it('should ignore shortcuts with the number of keys fewer than 2 or more than 3', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(100),
                async () => {
                    await new Preferences().load();

                    const input = shortcutDom.getCommandInput();
                    const prevValue = input.value;

                    [[ShortcutPreferencesDOM.createKeyboardEventOption()],
                        [ShortcutPreferencesDOM.createKeyboardEventOption(), ShortcutPreferencesDOM.createKeyboardEventOption(),
                            ShortcutPreferencesDOM.createKeyboardEventOption(), 
                            ShortcutPreferencesDOM.createKeyboardEventOption()]].forEach(combinations => {
                        shortcutDom.dispatchCombination(false, ...combinations);
                        assert.strictEqual(input.value, prevValue);
                    });
                }));

        it('should ignore shortcuts with keys containing CTRL, SHIFT or BACKSPACE', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(100),
                async () => {
                    await new Preferences().load();

                    const input = shortcutDom.getCommandInput();
                    const prevValue = input.value;

                    const printScreenKey = 'PrintScreen';
                    [[ShortcutPreferencesDOM.createKeyboardEventOption(), 
                        ShortcutPreferencesDOM.createKeyboardEventOptionWithShift(),
                        ShortcutPreferencesDOM.createKeyboardEventOption()],
                    [ShortcutPreferencesDOM.createKeyboardEventOption(), 
                        ShortcutPreferencesDOM.createKeyboardEventOptionWithCtrl(), 
                        ShortcutPreferencesDOM.createKeyboardEventOption()],
                    [ShortcutPreferencesDOM.createKeyboardEventOption(printScreenKey, printScreenKey),
                        ShortcutPreferencesDOM.createKeyboardEventOption()]].forEach(combinations => {
                        shortcutDom.dispatchCombination(false, ...combinations);
                        assert.strictEqual(input.value, prevValue);
                    });
                }));

        it('should ignore keys entered more than once following the shortcut length rule', 
            () => Expectation.expectResolution(StorageHelper.saveTestShortcuts(100),
                async () => {
                    await new Preferences().load();

                    const duplicatedKeyOptions = ShortcutPreferencesDOM.createKeyboardEventOption();
                    const keyOptions = ShortcutPreferencesDOM.createKeyboardEventOption();
                    const combination = [duplicatedKeyOptions, keyOptions, duplicatedKeyOptions];
                    shortcutDom.dispatchCombination(false, ...combination);
                    
                    const input = shortcutDom.getCommandInput();
                    const curCombination = input.value;
                    assert.strictEqual(curCombination, 
                        ShortcutPreferencesDOM.compileShortcut([duplicatedKeyOptions, keyOptions]));
                
                    const tooShortCombination = [duplicatedKeyOptions, duplicatedKeyOptions];
                    shortcutDom.dispatchCombination(false, ...tooShortCombination);
                    assert.strictEqual(input.value, curCombination);
                }));

        it('should not accumulate keys entered for different commands', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(),
                async () => {
                    await new Preferences().load();

                    const cmdInput = shortcutDom.getCommandInput();
                    const excessKeyOptions = ShortcutPreferencesDOM.createKeyboardEventOption();
                    shortcutDom.dispatchKeyDownEvent(cmdInput, excessKeyOptions);

                    const selector = shortcutDom.getCommandSelector();
                    selector.value = selector.options[selector.options.length - 1].value;
                    shortcutDom.dispatchChangeEvent(selector);
                    
                    const combination = [ShortcutPreferencesDOM.createKeyboardEventOption(), 
                        ShortcutPreferencesDOM.createKeyboardEventOption()];
                    shortcutDom.dispatchCombination(false, ...combination);
                    
                    assert.strictEqual(cmdInput.value, 
                        ShortcutPreferencesDOM.compileShortcut(combination));
                })); 

        it('should enter a shortcut with the number of 3 keys showing a message for applying', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(100),
                async () => {
                    await new Preferences().load();

                    const shortcutOptions = [ShortcutPreferencesDOM.createKeyboardEventOption(), 
                        ShortcutPreferencesDOM.createKeyboardEventOption(), ShortcutPreferencesDOM.createKeyboardEventOption()];

                    shortcutDom.dispatchCombination(false, ...shortcutOptions);
                    assert.strictEqual(shortcutDom.getCommandInput().value.toUpperCase(), 
                        ShortcutPreferencesDOM.compileShortcut(shortcutOptions));
                    assertReminderInfoMessage();
                }));

        it('should enter an allowed shortcut several times without any warnings and messages', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(100),
                async () => {
                    new Preferences().load();

                    const shortcutInUse = shortcutDom.getCommandInput().value;
                    
                    let i = 0;
                    while (i++ < 3)
                        shortcutDom.dispatchCombination(
                            ShortcutPreferencesDOM.createKeyboardEventOptions(shortcutInUse));
                    
                    shortcutDom.assertStatusIsEmpty();
                }));
        
        it('should enable the apply button after a shortcut has changed', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(100),
                async () => {
                    new Preferences().load();

                    shortcutDom.dispatchCombination();
                    assert(!shortcutDom.getApplyButton().disabled);
                }));

        it('should disable the apply button and show no messages when a shortcut has not changed', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(100),
                async () => {
                    new Preferences().load();

                    const shortcutInUse = shortcutDom.getCommandInput().value;
                    shortcutDom.dispatchCombination(
                        ShortcutPreferencesDOM.createKeyboardEventOptions(shortcutInUse));
                    assert(shortcutDom.getApplyButton().disabled);
                    shortcutDom.assertStatusIsEmpty();
                }));

        it('should warn when entering a shortcut already in use', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(100),
                async () => {
                    const dataInUse = await enterShortcutInUse(new Preferences());
                    
                    const numberOfMessages = 2;
                    shortcutDom.assertStatusIsWarning(dataInUse.commandInUse, numberOfMessages);
                    shortcutDom.assertStatusIsWarning(dataInUse.shortcutInUse, numberOfMessages);
                }));
    });

    const clearSelectedShortcut = () => {
        const input = shortcutDom.getCommandInput();
        assert(input.value);

        shortcutDom.dispatchClickEvent(shortcutDom.getClearButton());
        assert(!input.value);

        const selector = shortcutDom.getCommandSelector();
        return selector.value;
    };

    describe('#apply', function () {

        const confirmShortcutInUse = async (preferences, isConfirmed) => {
            let confirmationMsg;
            global.confirm = msg => {
                confirmationMsg = msg;
                return isConfirmed;
            };
            
            const dataInUse = await enterShortcutInUse(preferences, true);

            assert(confirmationMsg);
            assert(confirmationMsg.toUpperCase().includes(dataInUse.shortcutInUse.toUpperCase()));

            return dataInUse;
        };

        it('should clear a shortcut in use and apply it to a current command instead', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(100),
                async () => {
                    const preferences = new Preferences();
                    const dataInUse = await confirmShortcutInUse(preferences, true);

                    const curCommand = shortcutDom.getCommandSelector().value;
                    const curShortcut = shortcutDom.getCommandInput().value;

                    await preferences.save();

                    const loadedForm = await Preferences.loadFromStorage();
                    const loadedShortcuts = loadedForm.shortcuts;
                    assert(!loadedShortcuts[dataInUse.commandInUse]);

                    const actualShortcut = loadedShortcuts[curCommand];
                    assert(actualShortcut);
                    assert.deepStrictEqual(actualShortcut.key, curShortcut);
                }));

        
        it('should do nothing when cancelling confirmation for a shortcut in use', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(100),
                async expectedShortcuts => {
                    const preferences = new Preferences();
                    await confirmShortcutInUse(preferences, false);

                    await preferences.save();

                    const loadedForm = await Preferences.loadFromStorage();
                    assert.deepStrictEqual(loadedForm.shortcuts, expectedShortcuts);
                }));

        it('should disable the apply button if there is no command chosen', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(),
                async () => {
                    const preferences = new Preferences();
                    await preferences.load();

                    shortcutDom.getCommandSelector().value = null;
                    assert(shortcutDom.getApplyButton().disabled);
                }));

        it('should apply an empty shortcut', () => 
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(),
                async () => {
                    const preferences = new Preferences();
                    await preferences.load();

                    const curCommand = clearSelectedShortcut();
                    shortcutDom.dispatchClickEvent(shortcutDom.getApplyButton());

                    await preferences.save();

                    const loadedForm = await Preferences.loadFromStorage();
                    assert(loadedForm.shortcuts);
                    assert(!loadedForm.shortcuts[curCommand]);
                }));
    });

    describe('#clear', function () {
        it('should clear a shortcut in the input without applying it and show a reminder message', () =>
            Expectation.expectResolution(StorageHelper.saveTestShortcuts(),
                async expectedShortcuts => {
                    const preferences = new Preferences();
                    await preferences.load();

                    const curCommand = clearSelectedShortcut();
                    assertReminderInfoMessage();
                    const expectedShortcut = expectedShortcuts[curCommand];

                    await preferences.save();

                    const loadedForm = await Preferences.loadFromStorage();
                    assert(loadedForm.shortcuts);
                    assert.deepStrictEqual(loadedForm.shortcuts[curCommand], expectedShortcut);
                }));
    });
});
