import assert from 'assert';
import { Randomiser } from '../tools/randomiser.js';
import { EnvLoader } from '../tools/envLoader.js';

describe('content_script/messageReceiver', function () {
    this.timeout(0);
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/menuMessageEvent.js', 'MenuMessageEvent')
            .then(() => EnvLoader.loadClass('./content_scripts/messageReceiver.js', 'MessageReceiver')
                .then(() => EnvLoader.loadClass('./components/messageSender.js', 'MessageSender')
                    .then(() => done())))
            .catch(done);
    });

    const testReceivingEvents = (senderEvent, receiverEvent, arg = null) => {
        const receiver = new MessageReceiver(MessageSender[senderEvent](arg));

        assert.strictEqual(receiver[receiverEvent](), true);
        assert.strictEqual([receiver.shouldChangeColour(), receiver.shouldLoad(),
            receiver.shouldMark(), receiver.shouldSave(), receiver.shouldUnmark(), 
            receiver.shouldReturnTabState(), receiver.shouldAddNote(), 
            receiver.shouldRemoveNote(), receiver.shouldGoToNote(), 
            receiver.shouldSaveToCategory()].filter(e => e).length, 1);

        return receiver;
    };

    describe('#shouldMark', () => 
        it('should recognise an event as marking', () => {
            const colourClass = Randomiser.getRandomNumberUpToMax();
            const receiver = testReceivingEvents('startMarking', 'shouldMark', colourClass);
            
            assert.strictEqual(receiver.markColourClass, colourClass);
            assert(!receiver.noteLink);
            assert(!receiver.category);
        })
    );

    describe('#shouldChangeColour', () => 
        it('should recognise an event as changing colour', () =>
            testReceivingEvents('startChangingColour', 'shouldChangeColour', Randomiser.getRandomNumberUpToMax()))
    );

    describe('#shouldUnmark', () => 
        it('should recognise an event as unmarking', () =>
            testReceivingEvents('startUnmarking', 'shouldUnmark'))
    );

    describe('#shouldSave', () => 
        it('should recognise an event as saving', () =>
            testReceivingEvents('startSaving', 'shouldSave'))
    );

    describe('#shouldSaveToCategory', () => 
        it('should recognise an event as saving a page to a category', () => {
            const categoryTitle = Randomiser.getRandomString();
            const receiver = testReceivingEvents('startSavingToCategory', 'shouldSaveToCategory', 
                categoryTitle);
            
            assert.deepStrictEqual(receiver.category, categoryTitle);
            assert(!receiver.noteLink);
            assert(!receiver.markColourClass);
        })  
    );

    describe('#shouldLoad', () => 
        it('should recognise an event as loading', () =>
            testReceivingEvents('startLoading', 'shouldLoad'))
    );
    
    describe('#shouldReturnTabState', () =>
        it('should recognise an event as loading a current tab state', () =>
            testReceivingEvents('startLoadingTabState', 'shouldReturnTabState'))
    );

    describe('#shouldAddNote', () => 
        it('should recognise an event as adding a note', () =>
            testReceivingEvents('startAddingNote', 'shouldAddNote'))
    );

    describe('#shouldRemoveNote', () => 
        it('should recognise an event as removing a note', () =>
            testReceivingEvents('startRemovingNote', 'shouldRemoveNote'))
    );

    describe('#shouldGoToNote', () => 
        it('should recognise an event as going to a note', () => {
            const noteLink = Randomiser.getRandomString();
            const receiver = testReceivingEvents('startGoingToNote', 'shouldGoToNote', noteLink);
            
            assert.deepStrictEqual(receiver.noteLink, { id: noteLink });
            assert(!receiver.category);
            assert(!receiver.markColourClass);
        })  
    );

    const testSendingEvents = (receiverEvent, senderEvent, ...args) => {
        const msg = MessageReceiver[receiverEvent].call(null, ...args);
        const sender = new MessageSender(msg);
        
        assert.strictEqual(sender[senderEvent](), true);
        assert.strictEqual([sender.shouldSetMarkMenuReady(), sender.shouldSetUnmarkMenuReady(),
            sender.shouldSetSaveMenuReady(), sender.shouldSetLoadMenuReady(), sender.shouldLoadPreferences(),
            sender.shouldSetAddNoteMenuReady(), sender.shouldSetRemoveNoteMenuReady(), 
            sender.shouldAddNoteLinks(), sender.shouldAddCategories()].filter(e => e).length, 1);

        return sender;
    };

    describe('#setMarkMenuReady', () => 
        it('should recognise an event as setting mark menu ready', () =>
            testSendingEvents('setMarkMenuReady', 'shouldSetMarkMenuReady'))
    );

    describe('#setUnmarkMenuReady', () =>
        it('should recognise an event as setting unmark menu ready', () =>
            testSendingEvents('setUnmarkMenuReady', 'shouldSetUnmarkMenuReady'))
    );

    describe('#setSaveMenuReady', () =>
        it('should recognise an event as setting save menu ready', () =>
            testSendingEvents('setSaveMenuReady', 'shouldSetSaveMenuReady'))
    );

    describe('#setLoadMenuReady', () =>
        it('should recognise an event as setting load menu ready', () =>
            testSendingEvents('setLoadMenuReady', 'shouldSetLoadMenuReady'))
    );

    describe('#loadPreferences', () =>
        it('should recognise an event as loading preferences', () =>
            testSendingEvents('loadPreferences', 'shouldLoadPreferences'))
    );

    describe('#setAddNoteMenuReady', () =>
        it('should recognise an event as setting menu ready for adding a note', () =>
            testSendingEvents('setAddNoteMenuReady', 'shouldSetAddNoteMenuReady'))
    );

    describe('#setRemoveNoteMenuReady', () =>
        it('should recognise an event as setting menu ready for removing a note', () =>
            testSendingEvents('setRemoveNoteMenuReady', 'shouldSetRemoveNoteMenuReady'))
    );

    const createRandomLink = () => {
        return {
            id: Randomiser.getRandomString(),
            text: Randomiser.getRandomString()
        };
    };

    describe('#addNoteLinks', () =>
        it('should recognise an event as adding note links to menu', () => {
            const links = [createRandomLink(), createRandomLink()];
            const sender = testSendingEvents('addNoteLinks', 'shouldAddNoteLinks', links);
            assert.deepStrictEqual(sender.noteLinks, links);
        })
    );

    describe('#addCategories', () =>
        it('should recognise an event as adding categories to menu', () => {
            const categoryTitles = [Randomiser.getRandomString(), Randomiser.getRandomString()];
            const defaultCategoryTitle = Randomiser.getRandomString();
            
            const sender = testSendingEvents('addCategories', 'shouldAddCategories', 
                categoryTitles, defaultCategoryTitle);
            assert.deepStrictEqual(sender.categories, categoryTitles);
            assert.deepStrictEqual(sender.defaultCategory, defaultCategoryTitle);
        })
    );

    describe('#combineEvents', function () {
        it('should return null when combining undefined events', () =>
            assert.strictEqual(
                MessageReceiver.combineEvents(undefined, undefined), null));

        it('should filter out null events and combine the rest correctly', () => {
            const expectedNoteLinks = [createRandomLink(), createRandomLink()];
            const expectedCategoryTitles = [Randomiser.getRandomString(), Randomiser.getRandomString()];
            const expectedDefaultCategoryTitles = Randomiser.getRandomString();

            const msg = MessageReceiver.combineEvents(undefined, 
                MessageReceiver.setLoadMenuReady(), undefined, 
                MessageReceiver.setSaveMenuReady(), null, 
                MessageReceiver.setMarkMenuReady(),
                MessageReceiver.setRemoveNoteMenuReady(),
                MessageReceiver.addNoteLinks(expectedNoteLinks),
                MessageReceiver.addCategories(expectedCategoryTitles, 
                    expectedDefaultCategoryTitles));

            assert(msg);

            assert(msg.event);
            assert.strictEqual(msg.event.length, 6);

            assert(msg.noteLink);
            assert.deepStrictEqual(msg.noteLink, expectedNoteLinks);

            assert(msg.category);
            assert.deepStrictEqual(msg.category, expectedCategoryTitles);

            const sender = new MessageSender(msg);
            assert(sender.shouldSetSaveMenuReady());
            assert(sender.shouldSetLoadMenuReady());
            assert(sender.shouldSetRemoveNoteMenuReady());

            assert(sender.shouldSetMarkMenuReady());
            
            assert(sender.shouldAddNoteLinks());
            assert.deepStrictEqual(sender.noteLinks, expectedNoteLinks);

            assert(sender.shouldAddCategories());
            assert.deepStrictEqual(sender.categories, expectedCategoryTitles);
            assert.deepStrictEqual(sender.defaultCategory, expectedDefaultCategoryTitles);
        });
    });
});
