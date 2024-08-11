import assert from 'assert';
import { SenderMessage } from '../../components/senderMessage.js';
import { Highlighter } from '../../content_scripts/highlighter.js';
import { EnvLoader } from '../tools/envLoader.js';
import { BrowserMocked } from '../tools/browserMocked.js';
import { Randomiser } from '../tools/randomiser.js';
import { ShortcutPreferencesDOM } from '../tools/preferencesDOM.js';
import { TestPageHelper } from '../tools/testPageHelper.js';
import { Expectation } from '../tools/expectation.js';
import { runWithMockedScrollIntoView } from '../tools/globalMocks.js';
import { PageInfo } from '../../content_scripts/pageInfo.js';
import { RangeMarker } from '../../content_scripts/rangeMarker.js';
import { NoteLink, RangeNote } from '../../content_scripts/rangeNote.js';
import { StorageHelper } from '../tools/storageHelper.js';
import { ReceiverMessage } from '../../content_scripts/receiverMessage.js';

describe('content_script/highlighter', function () { 
    this.timeout(0);

    const browser = new BrowserMocked();

    beforeEach('loadResources', done => {
        browser.resetRuntime();
        browser.resetBrowserStorage();

        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });
    
    afterEach('releaseResources', () => {
        RangeNote.clearCachedNoteLinks();
        
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

    const savePageWithMarkedRange = async (colourClass) => {
        const pageInfoToLoad = new PageInfo();
        markRange(colourClass);

        await pageInfoToLoad.save();

        return pageInfoToLoad;
    };

    const selectRange = () => TestPageHelper.setRange(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode);

    const markRange = (colourClass) => {
        selectRange();
        RangeMarker.markSelectedNodes(colourClass);

        selectRange();
    };
    
    const createNoteForRange = (text) => {
        selectRange();
        const note = RangeNote.createNote(text);
        
        selectRange();
        return note;
    };
    
    const markNode = (colourClass) => {
        TestPageHelper.setRange(TestPageHelper.setRangeForLastParagraphSentenceNode);
        RangeMarker.markSelectedNodes(colourClass);

        return TestPageHelper.getLastParagraphSentenceNode();
    };
    
    const createNoteForNode = (text) => {
        TestPageHelper.setRange(TestPageHelper.setRangeForLastParagraphSentenceNode);
        const note = RangeNote.createNote(text);

        return { node: TestPageHelper.getLastParagraphSentenceNode(), noteLink: note };
    };

    const dispatchMouseRightBtnClickEvent = (targetNode = null) => {
        (targetNode || document).dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true }));
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

            return Expectation.expectInNextLoopIteration(() => {
                assert(!warnMsgWhenPageUnchanged);
                assert(warnMsgWhenPageChanged);
                assert(warnMsgWhenPageChanged.length > 0);
            });
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

            return Expectation.expectInNextLoopIteration(() => assert(!warningTried));
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

            return Expectation.expectInNextLoopIteration(() => assert.strictEqual(shortcutCaughtCount, 2));
        });
        
        it('should set up no events for watching shortcuts when there are no shortcuts in loaded settings', async () => {
            const highlighter = new Highlighter();

            let shortcutCaughtCount = 0;
            highlighter._watchShortcuts = () => ++shortcutCaughtCount;

            await highlighter.initPreferences();

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

            return Expectation.expectInNextLoopIteration(() => assert.strictEqual(shortcutCaughtCount, 0));
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
            const colourClass = getRandomColourClass();
            await savePageWithMarkedRange(colourClass);

            const expectedHtml = document.body.outerHTML;
            document.getElementsByClassName(colourClass)[0].remove();

            browser.resetRuntime(() => {
                return { shouldLoad: true };
            });

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            assert.strictEqual(highlighter.domIsPure, true);

            assert.strictEqual(document.getElementsByClassName(colourClass).length, 1);
            assert.strictEqual(document.body.outerHTML, expectedHtml);
        });

        it('should load a loadable page when its page info requests it', async () => {
            const colourClass = getRandomColourClass();
            await savePageWithMarkedRange(colourClass);

            const expectedHtml = document.body.outerHTML;
            document.getElementsByClassName(colourClass)[0].remove();

            const loadableUri = PageInfo.generateLoadingUrl(Randomiser.getRandomUri());
            
            global.location = new URL(loadableUri);
            global.history = {
                pushState: () => {}
            };

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            assert.strictEqual(highlighter.domIsPure, true);

            assert.strictEqual(document.getElementsByClassName(colourClass).length, 1);
            assert.strictEqual(document.body.outerHTML, expectedHtml);
        });

        it('should not load a loadable page without a request for it', async () => {
            const colourClass = getRandomColourClass();
            await savePageWithMarkedRange(colourClass);

            const expectedHtml = document.body.outerHTML;
            document.getElementsByClassName(colourClass)[0].remove();

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            assert.strictEqual(highlighter.domIsPure, undefined);

            assert.strictEqual(document.getElementsByClassName(colourClass).length, 0);
            assert.notStrictEqual(document.body.outerHTML, expectedHtml);
        });

        it('should not load a page when it is non-loadable', async () => {
            const colourClass = getRandomColourClass();
            markRange(colourClass);

            const expectedHtml = document.body.outerHTML;
            document.getElementsByClassName(colourClass)[0].remove();
            
            browser.resetRuntime(() => {
                return { shouldLoad: true };
            });

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            assert.strictEqual(highlighter.domIsPure, undefined);

            assert.strictEqual(document.getElementsByClassName(colourClass).length, 0);
            assert.notStrictEqual(document.body.outerHTML, expectedHtml);
        });
    });

    describe('#setUpContextMenu', function () {
        it('should not enable marking, unmarking, note and storage options when there is no selection and a page has not changed', () => {
            new Highlighter();
            dispatchMouseRightBtnClickEvent();        
            
            return Expectation.expectInNextLoopIteration(() => {
                const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                assert.strictEqual(senderMsg.shouldSetMarkMenuReady(), false);
                assert.strictEqual(senderMsg.shouldSetUnmarkMenuReady(), false);
                assert.strictEqual(senderMsg.shouldSetAddNoteMenuReady(), false);
                assert.strictEqual(senderMsg.shouldSetRemoveNoteMenuReady(), false);
                assert.strictEqual(senderMsg.shouldSetSaveMenuReady(), false);
                assert.strictEqual(senderMsg.shouldSetLoadMenuReady(), false);
            });
        });

        it('should enable marking and adding a note for a non-marked selected range without a note', () => {
            new Highlighter();

            selectRange();
            dispatchMouseRightBtnClickEvent();        
            
            return Expectation.expectInNextLoopIteration(() => {
                const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                assert.strictEqual(senderMsg.shouldSetMarkMenuReady(), true);
                assert.strictEqual(senderMsg.shouldSetUnmarkMenuReady(), false);
                assert.strictEqual(senderMsg.shouldSetAddNoteMenuReady(), true);
                assert.strictEqual(senderMsg.shouldSetRemoveNoteMenuReady(), false);
            });
        });

        it('should enable marking, unmarking and adding a note for a marked selected range without a note', () => {
            new Highlighter();

            const colourClass = getRandomColourClass();
            markRange(colourClass);
            
            dispatchMouseRightBtnClickEvent();        
            
            return Expectation.expectInNextLoopIteration(() => {
                const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                assert.strictEqual(senderMsg.shouldSetMarkMenuReady(), true);
                assert.strictEqual(senderMsg.shouldSetUnmarkMenuReady(), true);
                assert.strictEqual(senderMsg.shouldSetAddNoteMenuReady(), true);
                assert.strictEqual(senderMsg.shouldSetRemoveNoteMenuReady(), false);
            });
        });

        it('should enable unmarking and adding a note for a marked selected node without a note', () => {
            new Highlighter();

            const colourClass = getRandomColourClass();
            const markedContainerNode = markNode(colourClass);
            
            const markedNode = markedContainerNode.getElementsByClassName(colourClass)[0];
            dispatchMouseRightBtnClickEvent(markedNode);        
            
            return Expectation.expectInNextLoopIteration(() => {
                const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                assert.strictEqual(senderMsg.shouldSetMarkMenuReady(), true);
                assert.strictEqual(senderMsg.shouldSetUnmarkMenuReady(), true);
                assert.strictEqual(senderMsg.shouldSetAddNoteMenuReady(), true);
                assert.strictEqual(senderMsg.shouldSetRemoveNoteMenuReady(), false);
            });
        });

        it('should enable marking, removing a note for a selected range with a note', () => {
            new Highlighter();

            const noteText = Randomiser.getRandomString();
            createNoteForRange(noteText);

            dispatchMouseRightBtnClickEvent();        
            
            return Expectation.expectInNextLoopIteration(() => {
                const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                assert.strictEqual(senderMsg.shouldSetMarkMenuReady(), true);
                assert.strictEqual(senderMsg.shouldSetUnmarkMenuReady(), false);
                assert.strictEqual(senderMsg.shouldSetAddNoteMenuReady(), false);
                assert.strictEqual(senderMsg.shouldSetRemoveNoteMenuReady(), true);
            });
        });

        it('should enable removing a note for a selected node with a note', () => {
            new Highlighter();

            const noteText = Randomiser.getRandomString();
            const notedContainerNode = createNoteForNode(noteText).node;

            const notedNode = notedContainerNode.getElementsByClassName(RangeNote.NOTE_CLASS_NAME)[0];
            dispatchMouseRightBtnClickEvent(notedNode);        

            return Expectation.expectInNextLoopIteration(() => {
                const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                assert.strictEqual(senderMsg.shouldSetMarkMenuReady(), false);
                assert.strictEqual(senderMsg.shouldSetUnmarkMenuReady(), false);
                assert.strictEqual(senderMsg.shouldSetAddNoteMenuReady(), false);
                assert.strictEqual(senderMsg.shouldSetRemoveNoteMenuReady(), true);
            });
        });

        it('should update shortcuts', async () => {
            const expectedShortcuts = ShortcutPreferencesDOM.createTestShortcuts(2);
            browser.resetRuntime(() => {
                return { shortcuts: expectedShortcuts };
            });

            const highlighter = new Highlighter();
            await highlighter.initPreferences();
    
            dispatchMouseRightBtnClickEvent();

            return Expectation.expectInNextLoopIteration(() => {
                const senderMsg = new SenderMessage(browser.getRuntimeMessages()[1]);
                assert.strictEqual(senderMsg.shouldUpdateShortcuts(), true);
                assert.deepStrictEqual(senderMsg.shortcuts, expectedShortcuts);
            });
        });

        it('should update note links', async () => {
            const note1 = createNoteForRange(Randomiser.getRandomString());
            const note2 = createNoteForNode(Randomiser.getRandomString()).noteLink;

            new Highlighter();
    
            dispatchMouseRightBtnClickEvent();

            return Expectation.expectInNextLoopIteration(() => {
                const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                assert.strictEqual(senderMsg.shouldAddNoteLinks(), true);
                assert.deepStrictEqual(senderMsg.noteLinks, [note1, note2]);
            });
        });

        it('should enable saving when a page has changed', () => {
            const highlighter = new Highlighter();
            highlighter._domIsPure = false;

            dispatchMouseRightBtnClickEvent();
            
            return Expectation.expectInNextLoopIteration(() => {
                const senderMsg = new SenderMessage(browser.getRuntimeMessages()[0]);
                assert.strictEqual(senderMsg.shouldSetSaveMenuReady(), true);
                assert.strictEqual(senderMsg.shouldSetLoadMenuReady(), false);
            });
        });

        it('should enable loading when a page is loadable', async () => {
            await savePageWithMarkedRange(getRandomColourClass());

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            dispatchMouseRightBtnClickEvent();
            
            return Expectation.expectInNextLoopIteration(() => {
                const senderMsg = new SenderMessage(browser.getRuntimeMessages()[1]);
                assert.strictEqual(senderMsg.shouldSetSaveMenuReady(), false);
                assert.strictEqual(senderMsg.shouldSetLoadMenuReady(), true);
            });
        });
        
        it('should log an error to console when setting up context menu failed', async () => {
            const errorReason = Randomiser.getRandomString();
            browser.resetRuntime(() => { throw new Error(errorReason); });
            
            new Highlighter();
            dispatchMouseRightBtnClickEvent();

            let consoleMsg;
            await mockConsole('error', (msg) => consoleMsg = msg, Expectation.expectInNextLoopIteration);

            assert.notEqual(consoleMsg, null);
            assert(consoleMsg.includes('setting menu availability'));
            assert(consoleMsg.includes(errorReason));
        });
    });

    describe('#processMessage', function () {
        it('should mark a selected range', () => {
            const colourClass = getRandomColourClass();
            const highlighter = new Highlighter();
            highlighter._curColourClass = colourClass;

            selectRange();
            
            dispatchMouseRightBtnClickEvent();
            
            return Expectation.expectInNextLoopIteration(async () => {
                await browser.callRuntimeOnMessageCallback(SenderMessage.startMarking());

                assert.strictEqual(highlighter.domIsPure, false);
                assert.strictEqual(document.getElementsByClassName(colourClass).length, 1);
            });
        });
        
        it('should mark a selected marked node with another colour', () => {
            const highlighter = new Highlighter();

            const initColourClass = getRandomColourClass();
            const markedContainerNode = markNode(initColourClass);
            const markedNode = markedContainerNode.getElementsByClassName(initColourClass)[0];
            
            const newColourClass = getRandomColourClass();
            highlighter._curColourClass = newColourClass;

            dispatchMouseRightBtnClickEvent(markedNode);
            
            return Expectation.expectInNextLoopIteration(async () => {
                await browser.callRuntimeOnMessageCallback(SenderMessage.startMarking());

                assert.strictEqual(document.getElementsByClassName(initColourClass).length, 2);
                assert.strictEqual(document.getElementsByClassName(newColourClass).length, 1);
            });
        });

        it('should not mark a selected range when the option is disabled', async () => {
            const colourClass = getRandomColourClass();
            const highlighter = new Highlighter();
            highlighter._curColourClass = colourClass;

            selectRange();
            
            await browser.callRuntimeOnMessageCallback(SenderMessage.startMarking());

            assert.strictEqual(highlighter.domIsPure, undefined);
            assert.strictEqual(document.getElementsByClassName(colourClass).length, 0);
        });

        it('should unmark one of selected marked nodes and leave DOM dirty', () => {
            const highlighter = new Highlighter();

            const colourClass = getRandomColourClass();
            const markedContainerNode = markNode(colourClass);
            const markedNode = markedContainerNode.getElementsByClassName(colourClass)[0];

            markRange(colourClass);

            dispatchMouseRightBtnClickEvent(markedNode);
            
            return Expectation.expectInNextLoopIteration(async () => {
                await browser.callRuntimeOnMessageCallback(SenderMessage.startUnmarking());

                assert.strictEqual(highlighter.domIsPure, false);
                assert.strictEqual(document.getElementsByClassName(colourClass).length, 3);
            });
        });

        it('should unmark a selected marked range and leave DOM pure', () => {
            const highlighter = new Highlighter();

            const colourClass = getRandomColourClass();
            markRange(colourClass);
            
            dispatchMouseRightBtnClickEvent();
            
            return Expectation.expectInNextLoopIteration(async () => {
                await browser.callRuntimeOnMessageCallback(SenderMessage.startUnmarking());

                assert.strictEqual(highlighter.domIsPure, true);
                assert.strictEqual(document.getElementsByClassName(colourClass).length, 0);
            });
        });

        it('should unmark a selected marked range and leave DOM loadable', async () => {
            const colourClass = getRandomColourClass();
            await savePageWithMarkedRange(colourClass);

            const highlighter = new Highlighter();
            await highlighter.initPreferences();

            dispatchMouseRightBtnClickEvent();
            
            return Expectation.expectInNextLoopIteration(async () => {
                await browser.callRuntimeOnMessageCallback(SenderMessage.startUnmarking());

                assert.strictEqual(highlighter.domIsPure, undefined);
                assert.strictEqual(document.getElementsByClassName(colourClass).length, 0);
            });
        });

        it('should not unmark a selected marked range when the option is disabled', async () => {
            const highlighter = new Highlighter();

            const colourClass = getRandomColourClass();
            markRange(colourClass);
            
            await browser.callRuntimeOnMessageCallback(SenderMessage.startUnmarking());

            assert.strictEqual(highlighter.domIsPure, undefined);
            assert.strictEqual(document.getElementsByClassName(colourClass).length, 1);
        });

        it('should change colour for a selected marked node', () => {
            new Highlighter();

            const initColourClass = getRandomColourClass();
            const markedContainerNode = markNode(initColourClass);
            const markedNode = markedContainerNode.getElementsByClassName(initColourClass)[0];
            
            dispatchMouseRightBtnClickEvent(markedNode);
            
            return Expectation.expectInNextLoopIteration(async () => {
                const newColourClass = getRandomColourClass();
                await browser.callRuntimeOnMessageCallback(SenderMessage.startChangingColour(newColourClass));

                assert.strictEqual(document.getElementsByClassName(initColourClass).length, 2);
                assert.strictEqual(document.getElementsByClassName(newColourClass).length, 1);
            });
        });

        it('should add a note for a selected range', () => {
            const highlighter = new Highlighter();

            selectRange();
            dispatchMouseRightBtnClickEvent();
            
            return Expectation.expectInNextLoopIteration(async () => {
                let noteText;
                global.prompt = () => noteText = Randomiser.getRandomString();

                const addedNoteInfo = await browser.callRuntimeOnMessageCallback(SenderMessage.startAddingNote());
                assert.notStrictEqual(noteText, undefined);

                const expectedNote = new NoteLink(1, noteText);
                assert.deepStrictEqual(addedNoteInfo, expectedNote);

                assert.strictEqual(highlighter.domIsPure, false);
                
                const noteLinks = RangeNote.getNoteLinks();
                assert.strictEqual(noteLinks.length, 1);
                assert.deepStrictEqual(noteLinks[0], expectedNote);
            });
        });

        it('should not add a note for a selected range when the option is disabled', async () => {
            const highlighter = new Highlighter();

            selectRange();
            
            let noteText;
            global.prompt = () => noteText = Randomiser.getRandomString();

            const addedNoteInfo = await browser.callRuntimeOnMessageCallback(SenderMessage.startAddingNote());
            assert.strictEqual(noteText, undefined);
            assert.strictEqual(addedNoteInfo, undefined);
            assert.strictEqual(highlighter.domIsPure, undefined);
            
            assert.strictEqual(RangeNote.getNoteLinks().length, 0);
        });

        it('should remove a note for a selected range with a note and leave DOM pure', () => {
            const highlighter = new Highlighter();

            const noteText = Randomiser.getRandomString();
            createNoteForRange(noteText);
            
            dispatchMouseRightBtnClickEvent();
            
            return Expectation.expectInNextLoopIteration(async () => {
                const removedNoteId = await browser.callRuntimeOnMessageCallback(SenderMessage.startRemovingNote());
                assert.strictEqual(removedNoteId, '1');

                assert.strictEqual(highlighter.domIsPure, true);

                const noteLinks = RangeNote.getNoteLinks();
                assert.strictEqual(noteLinks.length, 0);
            });
        });

        it('should not remove a note for a selected range with a note when the option is disabled', async () => {
            const highlighter = new Highlighter();

            const noteText = Randomiser.getRandomString();
            createNoteForRange(noteText);
            
            const removedNoteId = await browser.callRuntimeOnMessageCallback(SenderMessage.startRemovingNote());
            assert.strictEqual(removedNoteId, undefined);
            assert.strictEqual(highlighter.domIsPure, undefined);

            assert.strictEqual(RangeNote.getNoteLinks().length, 1);
        });

        it('should navigate to a note', () => {
            const highlighter = new Highlighter();

            const noteText = Randomiser.getRandomString();
            createNoteForRange(noteText);
            
            dispatchMouseRightBtnClickEvent();
            
            return Expectation.expectInNextLoopIteration(async () => {
                const expectedNoteId = 1;
                const scrollTargetElement = await runWithMockedScrollIntoView(async () => {
                    await browser.callRuntimeOnMessageCallback(SenderMessage.startGoingToNote(expectedNoteId));
                });

                assert.notStrictEqual(scrollTargetElement, undefined);
                assert.strictEqual(RangeNote.hasNote(scrollTargetElement), true);
                assert.strictEqual(scrollTargetElement.dataset.noteId, expectedNoteId.toString());

                assert.strictEqual(highlighter.domIsPure, undefined);
            });
        });

        it('should save a changed page', () => {
            const highlighter = new Highlighter();

            const expectedUri = Randomiser.getRandomUri();
            highlighter._pageInfo._uri = expectedUri;

            highlighter._domIsPure = false;
            dispatchMouseRightBtnClickEvent();
            
            return Expectation.expectInNextLoopIteration(async () => {
                await browser.callRuntimeOnMessageCallback(SenderMessage.startSaving());
                assert.strictEqual(highlighter.domIsPure, true);
                
                const storedPagesWithCategories = await PageInfo.getAllSavedPagesWithCategories();
                const storedPages = storedPagesWithCategories.pagesInfo;
                assert.strictEqual(storedPages.length, 1);
                assert.strictEqual(storedPages[0].uri, expectedUri);
                assert.strictEqual(storedPagesWithCategories.pageCategories[expectedUri], undefined);
            });
        });

        it('should save a changed page to a category', async () => {
            const highlighter = new Highlighter();

            const categories = await StorageHelper.saveTestCategories(3, 0);
            const expectedCategoryName = categories[1].title;

            const expectedUri = Randomiser.getRandomUri();
            highlighter._pageInfo._uri = expectedUri;
            highlighter._pageInfo._pageCategory._uri = expectedUri;

            highlighter._domIsPure = false;
            dispatchMouseRightBtnClickEvent();
            
            return Expectation.expectInNextLoopIteration(async () => {
                await browser.callRuntimeOnMessageCallback(SenderMessage.startSavingToCategory(expectedCategoryName));
                assert.strictEqual(highlighter.domIsPure, true);
                
                const storedPagesWithCategories = await PageInfo.getAllSavedPagesWithCategories();
                const storedPages = storedPagesWithCategories.pagesInfo;
                assert.strictEqual(storedPages.length, 1);
                assert.strictEqual(storedPages[0].uri, expectedUri);
                assert.strictEqual(storedPagesWithCategories.pageCategories[expectedUri], expectedCategoryName);
            });
        });

        it('should not save a changed page when the option is disabled', async () => {
            const highlighter = new Highlighter();

            const expectedUri = Randomiser.getRandomUri();
            highlighter._pageInfo._uri = expectedUri;
    
            await browser.callRuntimeOnMessageCallback(SenderMessage.startSaving());
            assert.strictEqual(highlighter.domIsPure, undefined);
            
            const storedPages = await PageInfo.getAllSavedPagesFullInfo();
            assert.strictEqual(storedPages.length, 0);
        });

        it('should load a loadable page', async () => {
            const colourClass = getRandomColourClass();
            await savePageWithMarkedRange(colourClass);

            const expectedHtml = document.body.outerHTML;
            document.getElementsByClassName(colourClass)[0].remove();

            const highlighter = new Highlighter();
            highlighter._canLoad = true;

            dispatchMouseRightBtnClickEvent();

            return Expectation.expectInNextLoopIteration(async () => {
                await browser.callRuntimeOnMessageCallback(SenderMessage.startLoading());
                assert.strictEqual(highlighter.domIsPure, true);
                
                assert.strictEqual(document.getElementsByClassName(colourClass).length, 1);
                assert.strictEqual(document.body.outerHTML, expectedHtml);
            });
        });

        it('should update note links after loading a page', async () => {
            const note = createNoteForRange(Randomiser.getRandomString());

            const pageInfoToLoad = new PageInfo();
            await pageInfoToLoad.save();

            selectRange();
            RangeNote.removeNote();

            const highlighter = new Highlighter();
            highlighter._canLoad = true;

            dispatchMouseRightBtnClickEvent();

            return Expectation.expectInNextLoopIteration(async () => {
                await browser.callRuntimeOnMessageCallback(SenderMessage.startLoading());
        
                highlighter._setUpContextMenu();
                const senderMsg = new SenderMessage(browser.getRuntimeMessages()[1]);
                assert.deepStrictEqual(senderMsg.noteLinks, [note]);
            });
        });

        it('should not load a loadable page when the option is disabled', async () => {
            const colourClass = getRandomColourClass();
            await savePageWithMarkedRange(colourClass);

            document.getElementsByClassName(colourClass)[0].remove();
            const expectedHtml = document.body.outerHTML;

            const highlighter = new Highlighter();
            highlighter._canLoad = true;

            await browser.callRuntimeOnMessageCallback(SenderMessage.startLoading());
            assert.strictEqual(highlighter.domIsPure, undefined);
            
            assert.strictEqual(document.getElementsByClassName(colourClass).length, 0);
            assert.strictEqual(document.body.outerHTML, expectedHtml);
        });

        it('should return a tab state', async () => {
            const highlighter = new Highlighter();
            highlighter._canLoad = true;
            highlighter._domIsPure = false;

            const expectedShortcuts = ShortcutPreferencesDOM.createTestShortcuts(2);
            highlighter._shortcuts = expectedShortcuts;
    
            const responseMsg = await browser.callRuntimeOnMessageCallback(SenderMessage.startLoadingTabState());
            const senderMsg = new SenderMessage(responseMsg);
            assert.strictEqual(senderMsg.shouldUpdateShortcuts(), true);
            assert.deepStrictEqual(senderMsg.shortcuts, expectedShortcuts);
            assert.strictEqual(senderMsg.shouldSetLoadMenuReady(), true);
            assert.strictEqual(senderMsg.shouldSetSaveMenuReady(), true);
        });

        it('should log an error to console and throw it when processing an unknown message', () => {
            new Highlighter();

            let consoleMsg;
            return Expectation.expectRejection(
                mockConsole('error', (msg) => consoleMsg = msg, () => browser.callRuntimeOnMessageCallback(ReceiverMessage.loadPreferences())), 
                undefined, 
                (error) => {
                    assert.strictEqual(error.toString(), consoleMsg);
                    assert(consoleMsg.includes(ReceiverMessage.loadPreferences().event[0]));
                });
        });
    });
});
