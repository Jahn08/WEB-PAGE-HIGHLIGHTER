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
import { RangeNote } from '../../content_scripts/rangeNote.js';

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

    const getRandomColourClass = () => `${RangeMarker.MARKER_CLASS_NAME}_${Randomiser.getRandomString()}`;

    const saveMarkedPage = async (colourClassName) => {
        const pageInfoToLoad = new PageInfo();
        markRange(colourClassName);

        await pageInfoToLoad.save();

        return pageInfoToLoad;
    };

    const markRange = (colourClassName) => {
        TestPageHelper.setRange(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode);
        RangeMarker.markSelectedNodes(colourClassName);

        TestPageHelper.setRange(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode);
    };
    
    const createNoteForRange = (text) => {
        TestPageHelper.setRange(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode);
        const note = RangeNote.createNote(text);
        
        TestPageHelper.setRange(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode);
        return note;
    };
    
    const markNode = (colourClassName) => {
        TestPageHelper.setRange(TestPageHelper.setRangeForLastParagraphSentenceNode);
        RangeMarker.markSelectedNodes(colourClassName);

        return TestPageHelper.getLastParagraphSentenceNode();
    };
    
    const createNoteForNode = (text) => {
        TestPageHelper.setRange(TestPageHelper.setRangeForLastParagraphSentenceNode);
        const note = RangeNote.createNote(text);

        return { node: TestPageHelper.getLastParagraphSentenceNode(), noteLink: note };
    };

    describe('#initPreferences', function () {
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

        it('should load a loadable page when loaded settings request it', async () => {
            const colourClassName = getRandomColourClass();
            await saveMarkedPage(colourClassName);

            const expectedHtml = document.body.outerHTML;
            document.getElementsByClassName(colourClassName)[0].remove();

            browser.resetRuntime(() => {
                return { shouldLoad: true };
            });

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            assert.strictEqual(highlighter.domIsPure, true);

            assert.strictEqual(document.getElementsByClassName(colourClassName).length, 1);
            assert.strictEqual(document.body.outerHTML, expectedHtml);
        });

        it('should load a loadable page when its page info requests it', async () => {
            const colourClassName = getRandomColourClass();
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

            assert.strictEqual(highlighter.domIsPure, true);

            assert.strictEqual(document.getElementsByClassName(colourClassName).length, 1);
            assert.strictEqual(document.body.outerHTML, expectedHtml);
        });

        it('should not load a loadable page without a request for it', async () => {
            const colourClassName = getRandomColourClass();
            await saveMarkedPage(colourClassName);

            const expectedHtml = document.body.outerHTML;
            document.getElementsByClassName(colourClassName)[0].remove();

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            assert.strictEqual(highlighter.domIsPure, undefined);

            assert.strictEqual(document.getElementsByClassName(colourClassName).length, 0);
            assert.notStrictEqual(document.body.outerHTML, expectedHtml);
        });

        it('should not load a page when it is non-loadable', async () => {
            const colourClassName = getRandomColourClass();
            markRange(colourClassName);

            const expectedHtml = document.body.outerHTML;
            document.getElementsByClassName(colourClassName)[0].remove();
            
            browser.resetRuntime(() => {
                return { shouldLoad: true };
            });

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            assert.strictEqual(highlighter.domIsPure, undefined);

            assert.strictEqual(document.getElementsByClassName(colourClassName).length, 0);
            assert.notStrictEqual(document.body.outerHTML, expectedHtml);
        });
    });

    describe('#setUpContextMenu', function () {
        const dispatchMouseRightBtnClickEvent = (targetNode = null) => {
            (targetNode || document).dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true }));
        };

        it('should not enable marking, unmarking, note and storage options when there is no selection and page has not changed', () => {
            const highlighter = new Highlighter();
            dispatchMouseRightBtnClickEvent();        
            
            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    assert.strictEqual(highlighter._markingIsEnabled, false);
                    assert.strictEqual(highlighter._unmarkingIsEnabled, false);
                    assert.strictEqual(highlighter._addingNoteIsEnabled, false);
                    assert.strictEqual(highlighter._removingNoteIsEnabled, false);
                    assert.strictEqual(highlighter._savingIsEnabled, false);
                    assert.strictEqual(highlighter._loadingIsEnabled, false);

                    const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                    assert.strictEqual(senderMsg.shouldSetMarkMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetUnmarkMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetAddNoteMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetRemoveNoteMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetSaveMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetLoadMenuReady(), false);
                    
                    resolve();
                });
            }));
        });

        it('should enable marking and adding a note for a non-marked selected range without a note', () => {
            const highlighter = new Highlighter();

            TestPageHelper.setRange(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode);
            dispatchMouseRightBtnClickEvent();        
            
            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    assert.strictEqual(highlighter._markingIsEnabled, true);
                    assert.strictEqual(highlighter._unmarkingIsEnabled, false);
                    assert.strictEqual(highlighter._addingNoteIsEnabled, true);
                    assert.strictEqual(highlighter._removingNoteIsEnabled, false);

                    const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                    assert.strictEqual(senderMsg.shouldSetMarkMenuReady(), true);
                    assert.strictEqual(senderMsg.shouldSetUnmarkMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetAddNoteMenuReady(), true);
                    assert.strictEqual(senderMsg.shouldSetRemoveNoteMenuReady(), false);
                    
                    resolve();
                });
            }));
        });

        it('should enable marking, unmarking and adding a note for a marked selected range without a note', () => {
            const highlighter = new Highlighter();

            const colourClassName = getRandomColourClass();
            markRange(colourClassName);
            
            dispatchMouseRightBtnClickEvent();        
            
            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    assert.strictEqual(highlighter._markingIsEnabled, true);
                    assert.strictEqual(highlighter._unmarkingIsEnabled, true);
                    assert.strictEqual(highlighter._addingNoteIsEnabled, true);
                    assert.strictEqual(highlighter._removingNoteIsEnabled, false);

                    const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                    assert.strictEqual(senderMsg.shouldSetMarkMenuReady(), true);
                    assert.strictEqual(senderMsg.shouldSetUnmarkMenuReady(), true);
                    assert.strictEqual(senderMsg.shouldSetAddNoteMenuReady(), true);
                    assert.strictEqual(senderMsg.shouldSetRemoveNoteMenuReady(), false);
                    
                    resolve();
                });
            }));
        });

        it('should enable unmarking and adding a note for a marked selected node without a note', () => {
            const highlighter = new Highlighter();

            const colourClassName = getRandomColourClass();
            const markedContainerNode = markNode(colourClassName);
            
            const markedNode = markedContainerNode.getElementsByClassName(colourClassName)[0];
            dispatchMouseRightBtnClickEvent(markedNode);        
            
            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    assert.strictEqual(highlighter._markingIsEnabled, false);
                    assert.strictEqual(highlighter._unmarkingIsEnabled, true);
                    assert.strictEqual(highlighter._addingNoteIsEnabled, true);
                    assert.strictEqual(highlighter._removingNoteIsEnabled, false);

                    const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                    assert.strictEqual(senderMsg.shouldSetMarkMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetUnmarkMenuReady(), true);
                    assert.strictEqual(senderMsg.shouldSetAddNoteMenuReady(), true);
                    assert.strictEqual(senderMsg.shouldSetRemoveNoteMenuReady(), false);
                    
                    resolve();
                });
            }));
        });

        it('should enable marking, removing a note for a selected range with a note', () => {
            const highlighter = new Highlighter();

            const noteText = Randomiser.getRandomString();
            createNoteForRange(noteText);

            dispatchMouseRightBtnClickEvent();        
            
            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    assert.strictEqual(highlighter._markingIsEnabled, true);
                    assert.strictEqual(highlighter._unmarkingIsEnabled, false);
                    assert.strictEqual(highlighter._addingNoteIsEnabled, false);
                    assert.strictEqual(highlighter._removingNoteIsEnabled, true);

                    const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                    assert.strictEqual(senderMsg.shouldSetMarkMenuReady(), true);
                    assert.strictEqual(senderMsg.shouldSetUnmarkMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetAddNoteMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetRemoveNoteMenuReady(), true);
                    
                    resolve();
                });
            }));
        });

        it('should enable removing a note for a selected node with a note', () => {
            const highlighter = new Highlighter();

            const noteText = Randomiser.getRandomString();
            const notedContainerNode = createNoteForNode(noteText).node;

            const notedNode = notedContainerNode.getElementsByClassName(RangeNote.NOTE_CLASS_NAME)[0];
            dispatchMouseRightBtnClickEvent(notedNode);        

            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    assert.strictEqual(highlighter._markingIsEnabled, false);
                    assert.strictEqual(highlighter._unmarkingIsEnabled, false);
                    assert.strictEqual(highlighter._addingNoteIsEnabled, false);
                    assert.strictEqual(highlighter._removingNoteIsEnabled, true);

                    const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                    assert.strictEqual(senderMsg.shouldSetMarkMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetUnmarkMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetAddNoteMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetRemoveNoteMenuReady(), true);
                    
                    resolve();
                });
            }));
        });

        it('should update shortcuts', async () => {
            const expectedShortcuts = ShortcutPreferencesDOM.createTestShortcuts(2);
            browser.resetRuntime(() => {
                return { shortcuts: expectedShortcuts };
            });

            const highlighter = new Highlighter();
            await highlighter.initPreferences();
    
            dispatchMouseRightBtnClickEvent();

            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    const senderMsg = new SenderMessage(browser.getRuntimeMessages()[1]);
                    assert.strictEqual(senderMsg.shouldUpdateShortcuts(), true);
                    assert.deepStrictEqual(senderMsg.shortcuts, expectedShortcuts);
                    
                    resolve();
                });
            }));
        });

        it('should update note links', async () => {
            const note1 = createNoteForRange(Randomiser.getRandomString());
            const note2 = createNoteForNode(Randomiser.getRandomString()).noteLink;

            new Highlighter();
    
            dispatchMouseRightBtnClickEvent();

            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                    assert.strictEqual(senderMsg.shouldAddNoteLinks(), true);
                    assert.deepStrictEqual(senderMsg.noteLinks, [note1, note2]);

                    resolve();
                });
            }));
        });

        it('should enable saving when the page has changed', () => {
            const highlighter = new Highlighter();
            highlighter._domIsPure = false;

            dispatchMouseRightBtnClickEvent();
            
            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                    assert.strictEqual(highlighter._savingIsEnabled, true);
                    assert.strictEqual(highlighter._loadingIsEnabled, false);

                    assert.strictEqual(senderMsg.shouldSetSaveMenuReady(), true);
                    assert.strictEqual(senderMsg.shouldSetLoadMenuReady(), false);
                    
                    resolve();
                });
            }));
        });

        it('should enable loading when the page is loadable', async () => {
            await saveMarkedPage(getRandomColourClass());

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            dispatchMouseRightBtnClickEvent();
            
            return Expectation.expectResolution(new Promise((resolve) => {
                setImmediate(() => {
                    const senderMsg = new SenderMessage(browser.getRuntimeMessages()[1]);
                    assert.strictEqual(highlighter._savingIsEnabled, false);
                    assert.strictEqual(highlighter._loadingIsEnabled, true);

                    assert.strictEqual(senderMsg.shouldSetSaveMenuReady(), false);
                    assert.strictEqual(senderMsg.shouldSetLoadMenuReady(), true);
                    
                    resolve();
                });
            }));
        });
        
        it('should log an error to console when setting up context menu failed', async () => {
            const errorReason = Randomiser.getRandomString();
            browser.resetRuntime(() => { throw new Error(errorReason); });
            
            new Highlighter();
            dispatchMouseRightBtnClickEvent();

            let consoleMsg;
            await mockConsole('error', (msg) => consoleMsg = msg, 
                () => Expectation.expectResolution(new Promise((resolve) => setImmediate(resolve)))
            );

            assert.notEqual(consoleMsg, null);
            assert(consoleMsg.includes('setting menu availability'));
            assert(consoleMsg.includes(errorReason));
        });
    });
});
