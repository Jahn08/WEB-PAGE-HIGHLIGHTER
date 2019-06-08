import assert from 'assert';
import { Randomiser } from '../tools/randomiser';
import { EnvLoader } from '../tools/envLoader';

before((done) => {
    EnvLoader.loadClass('./content_scripts/menuMessageEvent.js', 'MenuMessageEvent')
        .then(() => done())
        .catch(done);
});

describe('content_script/menuMessageEvent', function () {
    const IS_MARK_EVENT_METHOD_NAME = 'isMarkEvent';
    const IS_CHANGE_COLOUR_EVENT_METHOD_NAME = 'isChangeColourEvent';
    const IS_SET_MARK_READY_EVENT_METHOD_NAME = 'isSetMarkReadyEvent';
    const IS_SET_UNMARK_READY_EVENT_METHOD_NAME = 'isSetUnmarkReadyEvent';
    const IS_UNMARK_EVENT_METHOD_NAME = 'isUnmarkEvent';
    const IS_LOAD_EVENT_METHOD_NAME = 'isLoadEvent';
    const IS_SET_LOAD_READY_EVENT_METHOD_NAME = 'isSetLoadReadyEvent';
    const IS_SAVE_EVENT_METHOD_NAME = 'isSaveEvent';
    const IS_SET_SAVE_READY_EVENT_METHOD_NAME = 'isSetSaveReadyEvent';
    
    const checkEventMethodNames = [IS_MARK_EVENT_METHOD_NAME, IS_CHANGE_COLOUR_EVENT_METHOD_NAME, 
        IS_SET_MARK_READY_EVENT_METHOD_NAME, IS_SET_UNMARK_READY_EVENT_METHOD_NAME,
        IS_UNMARK_EVENT_METHOD_NAME, IS_LOAD_EVENT_METHOD_NAME, IS_SAVE_EVENT_METHOD_NAME,
        IS_SET_LOAD_READY_EVENT_METHOD_NAME, IS_SET_SAVE_READY_EVENT_METHOD_NAME];

    const createEventWithColourAndCheckIt = function (createEventMethodName, checkEventMethodName,
        useSeveralColours = false) {
        const msgEvent = new MenuMessageEvent();
            
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
        const msgEvent = new MenuMessageEvent();
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

    const CREATE_LOAD_READY_EVENT_NAME = 'createLoadReadyEvent';
    describe('#' + CREATE_LOAD_READY_EVENT_NAME, () =>
        it('should create a loadReady event', () => 
            createEventAndCheckIt(CREATE_LOAD_READY_EVENT_NAME, IS_SET_LOAD_READY_EVENT_METHOD_NAME)));

    const CREATE_LOAD_EVENT_NAME = 'createLoadEvent';
    describe('#' + CREATE_LOAD_EVENT_NAME, () =>
        it('should create a load event', () => 
            createEventAndCheckIt(CREATE_LOAD_EVENT_NAME, IS_LOAD_EVENT_METHOD_NAME)));

    const CREATE_SAVE_READY_EVENT_NAME = 'createSaveReadyEvent';
    describe('#' + CREATE_SAVE_READY_EVENT_NAME, () =>
        it('should create a saveReady event', () => 
            createEventAndCheckIt(CREATE_SAVE_READY_EVENT_NAME, IS_SET_SAVE_READY_EVENT_METHOD_NAME)));

    const CREATE_SAVE_EVENT_NAME = 'createSaveEvent';
    describe('#' + CREATE_SAVE_EVENT_NAME, () =>
        it('should create a save event', () => 
            createEventAndCheckIt(CREATE_SAVE_EVENT_NAME, IS_SAVE_EVENT_METHOD_NAME)));

    describe('#combineEvents', function () {
        it('should combine several events correctly', function () {
            const msgEvent = new MenuMessageEvent();
            
            const changeColourClass = Randomiser.getRandomNumberUpToMax();
            const changeColourEvent = msgEvent.createChangeColourEvent(changeColourClass); 
            
            const markReadyColourClass = Randomiser.getRandomNumberUpToMax();
            const markReadyEvent = msgEvent.createMarkReadyEvent([markReadyColourClass]); 
            
            const unmarkReadyEvent = msgEvent.createUnmarkReadyEvent(); 
            const unmarkEvent = msgEvent.createUnmarkEvent();

            const saveReadyEvent = msgEvent.createSaveReadyEvent(); 
            const saveEvent = msgEvent.createSaveEvent();

            const _events = msgEvent.combineEvents([changeColourEvent, markReadyEvent, 
                unmarkReadyEvent, unmarkEvent, saveEvent, saveReadyEvent]);
            
            assert(!msgEvent.isMarkEvent(_events));
            assert(!msgEvent.isLoadEvent(_events));
            assert(!msgEvent.isSetLoadReadyEvent(_events));
            assert(msgEvent.isSetMarkReadyEvent(_events));
            assert(msgEvent.isChangeColourEvent(_events));
            assert(msgEvent.isUnmarkEvent(_events));
            assert(msgEvent.isSetUnmarkReadyEvent(_events));
            assert(msgEvent.isSetSaveReadyEvent(_events));
            assert(msgEvent.isSaveEvent(_events));

            const colourClasses = msgEvent.getMarkColourClasses(_events);
            assert.strictEqual(colourClasses.length, 2);
            assert(colourClasses.every(c => c === changeColourClass || c === markReadyColourClass));
        });
    });
});
