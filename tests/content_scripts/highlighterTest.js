import assert from 'assert';
import { SenderMessage } from '../../components/senderMessage.js';
import { Highlighter } from '../../content_scripts/highlighter.js';
import { EnvLoader } from '../tools/envLoader.js';
import { BrowserMocked } from '../tools/browserMocked.js';
import { Randomiser } from '../tools/randomiser.js';
import { ShortcutPreferencesDOM } from '../tools/preferencesDOM.js';
import { TestPageHelper } from '../tools/testPageHelper.js';
import { Expectation } from '../tools/expectation.js';
import { PageInfo } from '../../content_scripts/pageInfo.js';
import { RangeMarker } from '../../content_scripts/rangeMarker.js';

describe('content_script/highlighter', function () { 
    this.timeout(0);

    const browser = new BrowserMocked();

    beforeEach('loadResources', done => {
        browser.resetRuntime();
        browser.resetBrowserStorage();

        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });
    
    afterEach('releaseResources', () => {        
        EnvLoader.unloadDomModel();
    });

    /* eslint-disable no-console */
    const mockConsole = async (methodName, consoleMethod, testCallback) => {
        let originalConsoleMethod;
        try {
            originalConsoleMethod = console[methodName];
            console[methodName] = consoleMethod;

            await testCallback();
        } finally {
            // eslint-disable-next-line require-atomic-updates
            console[methodName] = originalConsoleMethod;
        }
    };

    describe('#preferences', function () {
        it('should send a message for loading preferences on initialization', async () => {
            await new Highlighter().initPreferences();
            const msg = browser.getRuntimeMessages()[0];

            assert(new SenderMessage(msg).shouldLoadPreferences());
        });

        it('should log an error to console when loading preferences failed', async () => {
            const errorReason = Randomiser.getRandomString();
            browser.resetRuntime(() => { throw new Error(errorReason); });
            
            let consoleMsg;
            
            await mockConsole('error', (msg) => consoleMsg = msg, () => new Highlighter().initPreferences());

            assert.notEqual(consoleMsg, null);
            assert(consoleMsg.includes('getting preferences'));
            assert(consoleMsg.includes(errorReason));
        });

        it('should warn about unsaved changes before unloading a page', async () => {
            const highlighter = new Highlighter();

            let warnMsgWhenPageUnchanged;
            let warnMsgWhenPageChanged;
            const warnIfDomIsDirtyOriginal = highlighter._warnIfDomIsDirty.bind(highlighter);
            highlighter._warnIfDomIsDirty = (event) => { 
                warnMsgWhenPageUnchanged = warnIfDomIsDirtyOriginal(event);
                
                highlighter._domIsPure = false;
                warnMsgWhenPageChanged = warnIfDomIsDirtyOriginal(event);
            };

            await highlighter.initPreferences();

            window.dispatchEvent(new Event('beforeunload'));

            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    assert(!warnMsgWhenPageUnchanged);
                    assert(warnMsgWhenPageChanged);
                    assert(warnMsgWhenPageChanged.length > 0);
                    resolve();
                });
            }));
        });

        it('should turn off warning about unsaved changes before unloading a page', async () => {
            browser.resetRuntime(() => {
                return { shouldWarn: false };
            });

            const highlighter = new Highlighter();

            let warningTried = false;
            highlighter._warnIfDomIsDirty = () => warningTried = true;

            await highlighter.initPreferences();

            window.dispatchEvent(new Event('beforeunload'));

            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    assert(!warningTried);
                    resolve();
                });
            }));
        });

        it('should pass shortcuts from loaded settings and set up events for watching them', async () => {
            const expectedShortcuts = ShortcutPreferencesDOM.createTestShortcuts(2);
            browser.resetRuntime(() => {
                return { shortcuts: expectedShortcuts };
            });

            const highlighter = new Highlighter();

            let shortcutCaughtCount = 0;
            highlighter._watchShortcuts = () => ++shortcutCaughtCount;

            await highlighter.initPreferences();
            assert.deepStrictEqual(highlighter._shortcuts, expectedShortcuts);

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    assert.strictEqual(shortcutCaughtCount, 2);
                    resolve();
                });
            }));
        });
        
        it('should set up no events for watching shortcuts when there are no shortcuts in loaded settings', async () => {
            const highlighter = new Highlighter();

            let shortcutCaughtCount = 0;
            highlighter._watchShortcuts = () => ++shortcutCaughtCount;

            await highlighter.initPreferences();

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    assert.strictEqual(shortcutCaughtCount, 0);
                    resolve();
                });
            }));
        });

        it('should set up a default colour class from loaded settings', async () => {
            const expectedColourToken = Randomiser.getRandomString();
            browser.resetRuntime(() => {
                return { defaultColourToken: expectedColourToken };
            });

            const highlighter = new Highlighter();
            await highlighter.initPreferences();
            assert.strictEqual(highlighter._curColourClass, expectedColourToken);
        });

        const markElementOnPage = (colourClassName) => {
            TestPageHelper.setRange(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode);
            RangeMarker.markSelectedNodes(colourClassName);
        };

        const saveMarkedPage = async (colourClassName) => {
            const pageInfoToLoad = new PageInfo();
            markElementOnPage(colourClassName);

            await pageInfoToLoad.save();

            return pageInfoToLoad;
        };

        it('should load a loadable page when loaded settings request it', async () => {
            const colourClassName = `${RangeMarker.MARKER_CLASS_NAME}_orange`;
            await saveMarkedPage(colourClassName);

            const expectedHtml = document.body.outerHTML;
            document.getElementsByClassName(colourClassName)[0].remove();

            browser.resetRuntime(() => {
                return { shouldLoad: true };
            });

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            assert.strictEqual(document.getElementsByClassName(colourClassName).length, 1);
            assert.strictEqual(document.body.outerHTML, expectedHtml);
        });

        it('should load a loadable page when its page info requests it', async () => {
            const colourClassName = `${RangeMarker.MARKER_CLASS_NAME}_blue`;
            await saveMarkedPage(colourClassName);

            const expectedHtml = document.body.outerHTML;
            document.getElementsByClassName(colourClassName)[0].remove();

            const loadableUri = PageInfo.generateLoadingUrl(Randomiser.getRandomUri());
            
            global.location = new URL(loadableUri);
            global.history = {
                pushState: () => {}
            };

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            assert.strictEqual(document.getElementsByClassName(colourClassName).length, 1);
            assert.strictEqual(document.body.outerHTML, expectedHtml);
        });

        it('should not load a loadable page without a request for it', async () => {
            const colourClassName = `${RangeMarker.MARKER_CLASS_NAME}_green`;
            await saveMarkedPage(colourClassName);

            const expectedHtml = document.body.outerHTML;
            document.getElementsByClassName(colourClassName)[0].remove();

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            assert.strictEqual(document.getElementsByClassName(colourClassName).length, 0);
            assert.notStrictEqual(document.body.outerHTML, expectedHtml);
        });

        it('should not load a page when it is non-loadable', async () => {
            const colourClassName = `${RangeMarker.MARKER_CLASS_NAME}_yellow`;
            markElementOnPage(colourClassName);

            const expectedHtml = document.body.outerHTML;
            document.getElementsByClassName(colourClassName)[0].remove();
            
            browser.resetRuntime(() => {
                return { shouldLoad: true };
            });

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            assert.strictEqual(document.getElementsByClassName(colourClassName).length, 0);
            assert.notStrictEqual(document.body.outerHTML, expectedHtml);
        });
    });
});
