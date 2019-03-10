import assert from 'assert';
import { Randomiser } from '../tools/randomiser';
import { ScriptLoader } from '../tools/scriptLoader';

before((done) => {
    ScriptLoader.loadClass('./content_scripts/messageEvent.js', 'MessageEvent').then(done);
});

describe('content_script/messageEvent', () => {
    const IS_MARK_EVENT_METHOD_NAME = 'isMarkEvent';
    const IS_CHANGE_COLOUR_EVENT_METHOD_NAME = 'isChangeColourEvent';
    const IS_SET_MARK_READY_EVENT_METHOD_NAME = 'isSetMarkReadyEvent';
    const IS_SET_UNMARK_READY_EVENT_METHOD_NAME = 'isSetUnmarkReadyEvent';
    const IS_UNMARK_EVENT_METHOD_NAME = 'isUnmarkEvent';
    
    const checkEventMethodNames = [IS_MARK_EVENT_METHOD_NAME, IS_CHANGE_COLOUR_EVENT_METHOD_NAME, 
        IS_SET_MARK_READY_EVENT_METHOD_NAME, IS_SET_UNMARK_READY_EVENT_METHOD_NAME,
        IS_UNMARK_EVENT_METHOD_NAME];

    const createEventWithColourAndCheckIt = (createEventMethodName, checkEventMethodName) => {
        const msgEvent = new MessageEvent();
            
        const colourClass = Randomiser.getRandomNumberUpToMax();
        const event = msgEvent[createEventMethodName](colourClass);

        assert(event);
        
        checkEventMethodNames.forEach(m =>
            assert.strictEqual(msgEvent[m](event), m === checkEventMethodName));
        assert.strictEqual(msgEvent.getMarkColourClass(event), colourClass);
    };
   
    const CREATE_MARK_EVENT_NAME = 'createMarkEvent';
    describe('#' + CREATE_MARK_EVENT_NAME, () =>
        it('should create a mark event with a passed colour class', () => 
            createEventWithColourAndCheckIt(CREATE_MARK_EVENT_NAME, IS_MARK_EVENT_METHOD_NAME)));

    const CREATE_CHANGE_COLOUR_EVENT_NAME = 'createChangeColourEvent';
    describe('#' + CREATE_CHANGE_COLOUR_EVENT_NAME, () =>
        it('should create a change colour event with a passed colour class', () => 
            createEventWithColourAndCheckIt(CREATE_CHANGE_COLOUR_EVENT_NAME, IS_CHANGE_COLOUR_EVENT_METHOD_NAME)));

    const createEventAndCheckIt = (createEventMethodName, checkEventMethodName) => {
        const msgEvent = new MessageEvent();
        const event = msgEvent[createEventMethodName]();

        assert(event);
        checkEventMethodNames.forEach(m =>
            assert.strictEqual(msgEvent[m](event), m === checkEventMethodName));
    };
    
    const CREATE_MARK_READY_EVENT_NAME = 'createMarkReadyEvent';
    describe('#' + CREATE_MARK_READY_EVENT_NAME, () =>
        it('should create a markReady event', () => 
            createEventAndCheckIt(CREATE_MARK_READY_EVENT_NAME, IS_SET_MARK_READY_EVENT_METHOD_NAME)));

    const CREATE_UNMARK_READY_EVENT_NAME = 'createUnmarkReadyEvent';
    describe('#' + CREATE_UNMARK_READY_EVENT_NAME, () =>
        it('should create an unmarkReady event', () => 
            createEventAndCheckIt(CREATE_UNMARK_READY_EVENT_NAME, IS_SET_UNMARK_READY_EVENT_METHOD_NAME)));

    const CREATE_UNMARK_EVENT_NAME = 'createUnmarkEvent';
    describe('#' + CREATE_UNMARK_EVENT_NAME, () =>
        it('should create an unmark event', () => 
            createEventAndCheckIt(CREATE_UNMARK_EVENT_NAME, IS_UNMARK_EVENT_METHOD_NAME)));
});
