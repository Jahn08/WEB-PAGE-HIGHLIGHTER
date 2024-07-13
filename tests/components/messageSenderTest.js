import assert from 'assert';
import { BrowserMocked } from '../tools/browserMocked.js';
import { Randomiser } from '../tools/randomiser.js';
import { EnvLoader } from '../tools/envLoader.js';

describe('components/MessageSender', () => {
    before(done => {
        EnvLoader.loadClass('./content_scripts/menuMessageEvent.js', 'MenuMessageEvent')
            .then(() => EnvLoader.loadClass('./components/senderMessage.js', 'SenderMessage')
                .then(() => EnvLoader.loadClass('./components/messageSender.js', 'MessageSender')
                    .then(() => done())))
            .catch(done);
    });

    const initMockedBrowser = sendMessageOutcome => {
        const browserMocked = new BrowserMocked();
        browserMocked.setBrowserTab(sendMessageOutcome);

        return browserMocked;
    };
    
    const initMessageInfo = (data = {}) => Object.assign({ tabId: Randomiser.getRandomNumber(99) }, data);

    describe('#sendMarking', () =>
        it('should send the startMarking message to a tab', async () => {
            const browserMocked = initMockedBrowser();
            const msgInfo = initMessageInfo({ colourClass: Randomiser.getRandomString() });
            await MessageSender.sendMarking(msgInfo);

            const msgs = browserMocked.getTabMessages(msgInfo.tabId);
            assert.deepStrictEqual(msgs, [new MenuMessageEvent().createMarkEvent(msgInfo.colourClass)]);
        })
    );

    describe('#sendChangingColour', () =>
        it('should send the startChangingColour message to a tab', async () => {
            const browserMocked = initMockedBrowser();
            const msgInfo = initMessageInfo({ colourClass: Randomiser.getRandomString() });
            await MessageSender.sendChangingColour(msgInfo);

            const msgs = browserMocked.getTabMessages(msgInfo.tabId);
            assert.deepStrictEqual(msgs, [new MenuMessageEvent().createChangeColourEvent(msgInfo.colourClass)]);
        })
    );

    describe('#sendUnmarking', () =>
        it('should send the startUnmarking message to a tab', async () => {
            const browserMocked = initMockedBrowser();
            const msgInfo = initMessageInfo();
            await MessageSender.sendUnmarking(msgInfo);

            const msgs = browserMocked.getTabMessages(msgInfo.tabId);
            assert.deepStrictEqual(msgs, [new MenuMessageEvent().createUnmarkEvent()]);
        })
    );

    describe('#sendSaving', function () {
        it('should send the startSaving message to a tab', async () => {
            const browserMocked = initMockedBrowser();
            const msgInfo = initMessageInfo();
            await MessageSender.sendSaving(msgInfo);

            const msgs = browserMocked.getTabMessages(msgInfo.tabId);
            assert.deepStrictEqual(msgs, [new MenuMessageEvent().createSaveEvent()]);
        });

        it('should send the startSavingToCategory message to a tab', async () => {
            const browserMocked = initMockedBrowser();
            const msgInfo = initMessageInfo({ categoryTitle: Randomiser.getRandomString() });
            await MessageSender.sendSaving(msgInfo);

            const msgs = browserMocked.getTabMessages(msgInfo.tabId);
            assert.deepStrictEqual(msgs, [new MenuMessageEvent().createSaveToCategoryEvent(msgInfo.categoryTitle)]);
        });
    });
    
    describe('#sendLoading', () =>
        it('should send the startLoading message to a tab', async () => {
            const browserMocked = initMockedBrowser();
            const msgInfo = initMessageInfo();
            await MessageSender.sendLoading(msgInfo);

            const msgs = browserMocked.getTabMessages(msgInfo.tabId);
            assert.deepStrictEqual(msgs, [new MenuMessageEvent().createLoadEvent()]);
        })
    );
    
    describe('#sendAddingNote', () =>
        it('should send the startAddingNote message to a tab and pass a note link data', async () => {
            const expectedNote = { id: Randomiser.getRandomNumberUpToMax(), text: Randomiser.getRandomString() };
            const browserMocked = initMockedBrowser(expectedNote);

            let actualNote;
            const mockedMenu = { 
                appendNoteLink: (id, text) => { 
                    actualNote = { id, text };
                }
            };
            const msgInfo = initMessageInfo();
            await MessageSender.sendAddingNote(msgInfo, mockedMenu);

            const msgs = browserMocked.getTabMessages(msgInfo.tabId);
            assert.deepStrictEqual(msgs, [new MenuMessageEvent().createAddNoteEvent()]);
            assert.deepStrictEqual(actualNote, expectedNote);
        })
    );
    
    describe('#sendRemovingNote', () =>
        it('should send the startRemovingNote message to a tab and pass a note link id for removal', async () => {
            const expectedNote = { noteId: Randomiser.getRandomNumberUpToMax() };
            const browserMocked = initMockedBrowser(expectedNote);

            let actualNoteIdToRemove;
            const mockedMenu = { removeNoteLink: (id) => actualNoteIdToRemove = id};
            const msgInfo = initMessageInfo();
            await MessageSender.sendRemovingNote(msgInfo, mockedMenu);

            const msgs = browserMocked.getTabMessages(msgInfo.tabId);
            assert.deepStrictEqual(msgs, [new MenuMessageEvent().createRemoveNoteEvent()]);
            assert.equal(actualNoteIdToRemove, expectedNote);
        })
    );
    
    describe('#sendGoingToNote', () =>
        it('should send the startGoingToNote message to a tab', async () => {
            const browserMocked = initMockedBrowser();
            const msgInfo = initMessageInfo({ noteId: Randomiser.getRandomString() });
            await MessageSender.sendGoingToNote(msgInfo);

            const msgs = browserMocked.getTabMessages(msgInfo.tabId);
            assert.deepStrictEqual(msgs, [new MenuMessageEvent().createGoToNoteEvent({ id: msgInfo.noteId })]);
        })
    );
});
