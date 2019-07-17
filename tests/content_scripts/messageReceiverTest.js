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

    const testReceivingEvents = (senderEvent, receiverEvent, useColourArg = false) => {
        const expectedColour = useColourArg ? Randomiser.getRandomNumberUpToMax() : null;
        const receiver = new MessageReceiver(
            MessageSender[senderEvent](expectedColour));

        assert.strictEqual(receiver[receiverEvent](), true);
        assert.strictEqual([receiver.shouldChangeColour(), receiver.shouldLoad(),
            receiver.shouldMark(), receiver.shouldSave(), receiver.shouldUnmark(), receiver.shouldReturnTabState(),
            receiver.shouldAddNote(), receiver.shouldRemoveNote()]
            .filter(e => e).length, 1);

        assert.strictEqual(receiver.markColourClass, expectedColour);
    };

    describe('#shouldMark', () => 
        it('should recognise an event as marking', () =>
            testReceivingEvents('startMarking', 'shouldMark', true))
    );

    describe('#shouldChangeColour', () => 
        it('should recognise an event as changing colour', () =>
            testReceivingEvents('startChangingColour', 'shouldChangeColour', true))
    );

    describe('#shouldUnmark', () => 
        it('should recognise an event as unmarking', () =>
            testReceivingEvents('startUnmarking', 'shouldUnmark'))
    );

    describe('#shouldSave', () => 
        it('should recognise an event as saving', () =>
            testReceivingEvents('startSaving', 'shouldSave'))
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

    const testSendingEvents = (receiverEvent, senderEvent, useColoursArg = false) => {
        const expectedColours = useColoursArg ? 
            [Randomiser.getRandomNumberUpToMax(), Randomiser.getRandomNumberUpToMax()] : [];
        const sender = new MessageSender(
            MessageReceiver[receiverEvent](expectedColours));

        assert.strictEqual(sender[senderEvent](), true);
        assert.strictEqual([sender.shouldSetMarkMenuReady(), sender.shouldSetUnmarkMenuReady(),
            sender.shouldSetSaveMenuReady(), sender.shouldSetLoadMenuReady(), sender.shouldReturnPreferences(),
            sender.shouldSetAddNoteMenuReady(), sender.shouldSetRemoveNoteMenuReady()].filter(e => e).length, 1);

        assert.deepStrictEqual(sender.currentColourClasses, expectedColours);
    };

    describe('#setMarkMenuReady', () => 
        it('should recognise an event as setting mark menu ready', () =>
            testSendingEvents('setMarkMenuReady', 'shouldSetMarkMenuReady', true))
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
            testSendingEvents('loadPreferences', 'shouldReturnPreferences'))
    );

    describe('#setAddNoteMenuReady', () =>
        it('should recognise an event as setting menu ready for adding a note', () =>
            testSendingEvents('setAddNoteMenuReady', 'shouldSetAddNoteMenuReady'))
    );

    describe('#setRemoveNoteMenuReady', () =>
        it('should recognise an event as setting menu ready for removing a note', () =>
            testSendingEvents('setRemoveNoteMenuReady', 'shouldSetRemoveNoteMenuReady'))
    );

    describe('#combineEvents', function () {
        it('should return null when combining undefined events', () =>
            assert.strictEqual(
                MessageReceiver.combineEvents(undefined, undefined), null));

        it('should filter out null events and combine the rest correctly', () => {
            const expectedColours = [Randomiser.getRandomNumberUpToMax(),
                Randomiser.getRandomNumberUpToMax()];

            const msg =  MessageReceiver.combineEvents(undefined, 
                MessageReceiver.setLoadMenuReady(), undefined, 
                MessageReceiver.setSaveMenuReady(), null, 
                MessageReceiver.setMarkMenuReady(expectedColours),
                MessageReceiver.setRemoveNoteMenuReady());

            assert(msg);

            assert(msg.event);
            assert.strictEqual(msg.event.length, 4);
            
            assert(msg.colourClass);
            assert.deepStrictEqual(msg.colourClass, expectedColours);

            const sender = new MessageSender(msg);
            assert(sender.shouldSetSaveMenuReady());
            assert(sender.shouldSetLoadMenuReady());
            assert(sender.shouldSetRemoveNoteMenuReady());

            assert(sender.shouldSetMarkMenuReady());
            assert.deepStrictEqual(sender.currentColourClasses, expectedColours);
        });
    });
});
