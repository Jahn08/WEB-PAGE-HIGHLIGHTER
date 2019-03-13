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

    const createEventWithColourAndCheckIt = (createEventMethodName, checkEventMethodName,
        useSeveralColours = false) => {
        const msgEvent = new MessageEvent();
            
        const colourClass = useSeveralColours ? 
            [Randomiser.getRandomNumberUpToMax(), Randomiser.getRandomNumberUpToMax()] :
            Randomiser.getRandomNumberUpToMax();
        const event = msgEvent[createEventMethodName](colourClass);

        assert(event);
        
        checkEventMethodNames.forEach(m =>
            assert.strictEqual(msgEvent[m](event), m === checkEventMethodName));

        const actualColourClasses = msgEvent.getMarkColourClasses(event);

        if (useSeveralColours) {
            assert.strictEqual(actualColourClasses.length, colourClass.length);
            assert(actualColourClasses.every(ac => colourClass.includes(ac)));
        }
        else {
            assert.strictEqual(actualColourClasses.length, 1);
            assert(actualColourClasses.includes(colourClass));
        }
    };
   
    const CREATE_MARK_EVENT_NAME = 'createMarkEvent';
    describe('#' + CREATE_MARK_EVENT_NAME, () =>
        it('should create a mark event with a passed colour class', () => 
            createEventWithColourAndCheckIt(CREATE_MARK_EVENT_NAME, IS_MARK_EVENT_METHOD_NAME)));

    const CREATE_CHANGE_COLOUR_EVENT_NAME = 'createChangeColourEvent';
    describe('#' + CREATE_CHANGE_COLOUR_EVENT_NAME, () =>
        it('should create a change colour event with a passed colour class', () => 
            createEventWithColourAndCheckIt(CREATE_CHANGE_COLOUR_EVENT_NAME, IS_CHANGE_COLOUR_EVENT_METHOD_NAME)));

    const CREATE_MARK_READY_EVENT_NAME = 'createMarkReadyEvent';
    describe('#' + CREATE_MARK_READY_EVENT_NAME, () =>
        it('should create a markReady event', () => 
            createEventWithColourAndCheckIt(CREATE_MARK_READY_EVENT_NAME, IS_SET_MARK_READY_EVENT_METHOD_NAME, true)));

    const createEventAndCheckIt = (createEventMethodName, checkEventMethodName) => {
        const msgEvent = new MessageEvent();
        const event = msgEvent[createEventMethodName]();

        assert(event);
        checkEventMethodNames.forEach(m =>
            assert.strictEqual(msgEvent[m](event), m === checkEventMethodName));
    };
    
    const CREATE_UNMARK_READY_EVENT_NAME = 'createUnmarkReadyEvent';
    describe('#' + CREATE_UNMARK_READY_EVENT_NAME, () =>
        it('should create an unmarkReady event', () => 
            createEventAndCheckIt(CREATE_UNMARK_READY_EVENT_NAME, IS_SET_UNMARK_READY_EVENT_METHOD_NAME)));

    const CREATE_UNMARK_EVENT_NAME = 'createUnmarkEvent';
    describe('#' + CREATE_UNMARK_EVENT_NAME, () =>
        it('should create an unmark event', () => 
            createEventAndCheckIt(CREATE_UNMARK_EVENT_NAME, IS_UNMARK_EVENT_METHOD_NAME)));

    describe('#combineEvents', () => {
        it('should combine several events correctly', () => {
            const msgEvent = new MessageEvent();
            
            const changeColourClass = Randomiser.getRandomNumberUpToMax();
            const changeColourEvent = msgEvent.createChangeColourEvent(changeColourClass); 
            
            const markReadyColourClass = Randomiser.getRandomNumberUpToMax();
            const markReadyEvent = msgEvent.createMarkReadyEvent([markReadyColourClass]); 
            
            const unmarkReadyEvent = msgEvent.createUnmarkReadyEvent(); 
            const unmarkEvent = msgEvent.createUnmarkEvent(); 

            debugger
            const _events = msgEvent.combineEvents([changeColourEvent, markReadyEvent, 
                unmarkReadyEvent, unmarkEvent]);
            
            assert(!msgEvent.isMarkEvent(_events));
            assert(msgEvent.isSetMarkReadyEvent(_events));
            assert(msgEvent.isChangeColourEvent(_events));
            assert(msgEvent.isUnmarkEvent(_events));
            assert(msgEvent.isSetUnmarkReadyEvent(_events));

            const colourClasses = msgEvent.getMarkColourClasses(_events);
            assert.strictEqual(colourClasses.length, 2);
            assert(colourClasses.every(c => c === changeColourClass || c === markReadyColourClass));
        });
    });
});
