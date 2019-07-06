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
    const IS_LOAD_PREFERENCES_EVENT_METHOD_NAME = 'isLoadPreferencesEvent';
    const IS_LOAD_TAB_STATE_METHOD_NAME = 'isLoadTabStateEvent';
    
    const checkEventMethodNames = [IS_MARK_EVENT_METHOD_NAME, IS_CHANGE_COLOUR_EVENT_METHOD_NAME, 
        IS_SET_MARK_READY_EVENT_METHOD_NAME, IS_SET_UNMARK_READY_EVENT_METHOD_NAME,
        IS_UNMARK_EVENT_METHOD_NAME, IS_LOAD_EVENT_METHOD_NAME, IS_SAVE_EVENT_METHOD_NAME,
        IS_SET_LOAD_READY_EVENT_METHOD_NAME, IS_SET_SAVE_READY_EVENT_METHOD_NAME, 
        IS_LOAD_PREFERENCES_EVENT_METHOD_NAME, IS_LOAD_TAB_STATE_METHOD_NAME];

    const createEventWithColourAndCheckIt = function (createEventMethodName, checkEventMethodName,
        useSeveralColours = false) {
        const msgEvent = new global.MenuMessageEvent();
            
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
   
    const createTestForCheckingEventWithColour = (createEventMethodName, checkEventMethodName, 
        useSeveralColours = false) => {
        describe('#' + createEventMethodName, () =>
            it('should build a certain type of an event with a passed colour class', () => 
                createEventWithColourAndCheckIt(createEventMethodName, checkEventMethodName, useSeveralColours)));
    };

    createTestForCheckingEventWithColour('createMarkEvent', IS_MARK_EVENT_METHOD_NAME);

    createTestForCheckingEventWithColour('createChangeColourEvent', IS_CHANGE_COLOUR_EVENT_METHOD_NAME);

    createTestForCheckingEventWithColour('createMarkReadyEvent', IS_SET_MARK_READY_EVENT_METHOD_NAME, true);

    const createEventAndCheckIt = (createEventMethodName, checkEventMethodName) => {
        const msgEvent = new global.MenuMessageEvent();
        const event = msgEvent[createEventMethodName]();

        assert(event);
        checkEventMethodNames.forEach(m =>
            assert.strictEqual(msgEvent[m](event), m === checkEventMethodName));
    };
    
    const createTestForCheckingEvent = (createEventMethodName, checkEventMethodName) => {
        describe('#' + createEventMethodName, () =>
            it('should build a certain type of an event', () => 
                createEventAndCheckIt(createEventMethodName, checkEventMethodName)));
    };

    createTestForCheckingEvent('createUnmarkReadyEvent', IS_SET_UNMARK_READY_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createUnmarkEvent', IS_UNMARK_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createLoadReadyEvent', IS_SET_LOAD_READY_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createLoadEvent', IS_LOAD_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createSaveReadyEvent', IS_SET_SAVE_READY_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createSaveEvent', IS_SAVE_EVENT_METHOD_NAME);
    
    createTestForCheckingEvent('createLoadPreferencesEvent', IS_LOAD_PREFERENCES_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createLoadTabStateEvent', IS_LOAD_TAB_STATE_METHOD_NAME);

    describe('#combineEvents', function () {
        it('should combine several events correctly', function () {
            const msgEvent = new global.MenuMessageEvent();
            
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
            assert(!msgEvent.isLoadPreferencesEvent(_events));
            assert(!msgEvent.isLoadTabStateEvent(_events));
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
