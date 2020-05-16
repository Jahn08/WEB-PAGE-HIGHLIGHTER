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

    const IS_SET_ADD_NOTE_READY_EVENT_METHOD_NAME = 'isSetAddNoteReadyEvent';
    const IS_ADD_NOTE_EVENT_METHOD_NAME = 'isAddNoteEvent';
    const IS_SET_REMOVE_NOTE_READY_EVENT_METHOD_NAME = 'isSetRemoveNoteReadyEvent';
    const IS_REMOVE_NOTE_EVENT_METHOD_NAME = 'isRemoveNoteEvent';
    
    const IS_ADD_NOTE_LINKS_EVENT_METHOD_NAME = 'isAddNoteLinksEvent';
    const IS_GO_TO_NOTE_EVENT_METHOD_NAME = 'isGoToNoteEvent';
    
    const IS_ADD_CATEGORIES_EVENT_METHOD_NAME = 'isAddCategoriesEvent';
    const IS_SAVE_TO_CATEGORY_EVENT_METHOD_NAME = 'isSaveToCategoryEvent';

    const IS_EMIT_EVENT_METHOD_NAME = 'isEmitEvent';
    
    const checkEventMethodNames = [IS_MARK_EVENT_METHOD_NAME, IS_CHANGE_COLOUR_EVENT_METHOD_NAME, 
        IS_SET_MARK_READY_EVENT_METHOD_NAME, IS_SET_UNMARK_READY_EVENT_METHOD_NAME,
        IS_UNMARK_EVENT_METHOD_NAME, IS_LOAD_EVENT_METHOD_NAME, IS_SAVE_EVENT_METHOD_NAME,
        IS_SET_LOAD_READY_EVENT_METHOD_NAME, IS_SET_SAVE_READY_EVENT_METHOD_NAME, 
        IS_LOAD_PREFERENCES_EVENT_METHOD_NAME, IS_LOAD_TAB_STATE_METHOD_NAME, 
        IS_SET_ADD_NOTE_READY_EVENT_METHOD_NAME, IS_ADD_NOTE_EVENT_METHOD_NAME,
        IS_SET_REMOVE_NOTE_READY_EVENT_METHOD_NAME, IS_REMOVE_NOTE_EVENT_METHOD_NAME,
        IS_ADD_NOTE_LINKS_EVENT_METHOD_NAME, IS_GO_TO_NOTE_EVENT_METHOD_NAME,
        IS_ADD_CATEGORIES_EVENT_METHOD_NAME, IS_SAVE_TO_CATEGORY_EVENT_METHOD_NAME,
        IS_EMIT_EVENT_METHOD_NAME
    ];

    const createEventWithArgAndCheckIt = function (createEventMethodName, checkEventMethodName, 
        getActualArgMethodName, arg) {
        const msgEvent = new MenuMessageEvent();
        const event = msgEvent[createEventMethodName](arg);

        assert(event);
        
        checkEventMethodNames.forEach(m =>
            assert.strictEqual(msgEvent[m](event), m === checkEventMethodName));

        const actualArgs = msgEvent[getActualArgMethodName](event);

        if (Array.isArray(actualArgs)) {
            if (Array.isArray(arg)) {
                assert.strictEqual(actualArgs.length, arg.length);
                assert(actualArgs.every(ac => arg.includes(ac)));
            }
            else {
                assert.strictEqual(actualArgs.length, 1);
                assert(actualArgs.includes(arg));
            }    
        }
        else
            assert.strictEqual(actualArgs, arg);
    };
    
    const createTestForCheckingEventWithColour = (createEventMethodName, checkEventMethodName) => {
        describe('#' + createEventMethodName, () =>
            it('should build a certain type of an event with passed colour classes', () => {
                createEventWithArgAndCheckIt(createEventMethodName, checkEventMethodName, 
                    'getMarkColourClass', Randomiser.getRandomNumberUpToMax());
            })
        );
    };

    createTestForCheckingEventWithColour('createMarkEvent', IS_MARK_EVENT_METHOD_NAME);

    createTestForCheckingEventWithColour('createChangeColourEvent', IS_CHANGE_COLOUR_EVENT_METHOD_NAME);

    const createRandomLink = () => {
        return {
            id: '' + Randomiser.getRandomNumberUpToMax(),
            text: '' + Randomiser.getRandomNumberUpToMax()
        };
    };

    const createTestForCheckingEventWithNoteLink = (createEventMethodName, checkEventMethodName, 
        useSeveralNoteLinks = false) => {
        describe('#' + createEventMethodName, () =>
            it('should build a certain type of an event with passed note links', () => {
                const noteLinks = useSeveralNoteLinks ? [createRandomLink(), createRandomLink()] :
                    createRandomLink();
                createEventWithArgAndCheckIt(createEventMethodName, checkEventMethodName, 
                    'getNoteLinks', noteLinks);
            })
        );
    };

    createTestForCheckingEventWithNoteLink('createAddNoteLinksEvent', IS_ADD_NOTE_LINKS_EVENT_METHOD_NAME, true);

    createTestForCheckingEventWithNoteLink('createGoToNoteEvent', IS_GO_TO_NOTE_EVENT_METHOD_NAME);

    const createTestForCheckingEventWithCategories = (createEventMethodName, checkEventMethodName, 
        useSeveralNoteLinks = false) => {
        describe('#' + createEventMethodName, () =>
            it('should build a certain type of an event with passed categories', () => {
                const categoryTitles = useSeveralNoteLinks ? 
                    [Randomiser.getRandomString(), Randomiser.getRandomString()] :
                    Randomiser.getRandomString();
                createEventWithArgAndCheckIt(createEventMethodName, checkEventMethodName, 
                    'getCategories', categoryTitles);
            })
        );
    };

    createTestForCheckingEventWithCategories('createAddCategoriesEvent', 
        IS_ADD_CATEGORIES_EVENT_METHOD_NAME, true);

    createTestForCheckingEventWithCategories('createSaveToCategoryEvent', 
        IS_SAVE_TO_CATEGORY_EVENT_METHOD_NAME);
    
    const createTestForCheckingEventWithEventName = (createEventMethodName, checkEventMethodName) => {
        describe('#' + createEventMethodName, () =>
            it('should build a certain type of an event passing an event name', () => {
                createEventWithArgAndCheckIt(createEventMethodName, checkEventMethodName, 
                    'getEventName', Randomiser.getRandomNumberUpToMax());
            })
        );
    };

    createTestForCheckingEventWithEventName('createEmitEvent', IS_EMIT_EVENT_METHOD_NAME);

    const createEventAndCheckIt = (createEventMethodName, checkEventMethodName) => {
        const msgEvent = new MenuMessageEvent();
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

    createTestForCheckingEvent('createMarkReadyEvent', IS_SET_MARK_READY_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createUnmarkReadyEvent', IS_SET_UNMARK_READY_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createUnmarkEvent', IS_UNMARK_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createLoadReadyEvent', IS_SET_LOAD_READY_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createLoadEvent', IS_LOAD_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createSaveReadyEvent', IS_SET_SAVE_READY_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createSaveEvent', IS_SAVE_EVENT_METHOD_NAME);
    
    createTestForCheckingEvent('createLoadPreferencesEvent', IS_LOAD_PREFERENCES_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createLoadTabStateEvent', IS_LOAD_TAB_STATE_METHOD_NAME);

    createTestForCheckingEvent('createAddNoteReadyEvent', IS_SET_ADD_NOTE_READY_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createAddNoteEvent', IS_ADD_NOTE_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createRemoveNoteReadyEvent', IS_SET_REMOVE_NOTE_READY_EVENT_METHOD_NAME);

    createTestForCheckingEvent('createRemoveNoteEvent', IS_REMOVE_NOTE_EVENT_METHOD_NAME);

    describe('#combineEvents', function () {
        it('should combine several events correctly', function () {
            const msgEvent = new MenuMessageEvent();
            
            const changeColourClass = Randomiser.getRandomNumberUpToMax();
            const changeColourEvent = msgEvent.createChangeColourEvent(changeColourClass); 

            const markColourClass = Randomiser.getRandomNumberUpToMax();
            const markEvent = msgEvent.createMarkEvent(markColourClass);
            
            const unmarkReadyEvent = msgEvent.createUnmarkReadyEvent(); 
            const unmarkEvent = msgEvent.createUnmarkEvent();

            const eventName = Randomiser.getRandomNumberUpToMax();
            const emitEvent = msgEvent.createEmitEvent(eventName);

            const saveReadyEvent = msgEvent.createSaveReadyEvent(); 
            const saveEvent = msgEvent.createSaveEvent();

            const addNoteReadyEvent = msgEvent.createAddNoteReadyEvent(); 
            const addNoteEvent = msgEvent.createAddNoteEvent();

            const expectedNoteLinks = [createRandomLink(), createRandomLink()];
            const addNoteLinksEvent = msgEvent.createAddNoteLinksEvent(expectedNoteLinks);
            
            const expectedCategoryTitles = [Randomiser.getRandomString(), 
                Randomiser.getRandomString()];
            const expectedDefaultCategoryTitle = Randomiser.getRandomString();
            const addCategoriesEvent = msgEvent.createAddCategoriesEvent(expectedCategoryTitles,
                expectedDefaultCategoryTitle);

            const _events = msgEvent.combineEvents([changeColourEvent, markEvent, 
                unmarkReadyEvent, unmarkEvent, saveEvent, saveReadyEvent, 
                addNoteReadyEvent, addNoteEvent, addNoteLinksEvent, addCategoriesEvent, emitEvent]);
            
            assert(!msgEvent.isSetMarkReadyEvent(_events));
            assert(!msgEvent.isLoadEvent(_events));
            assert(!msgEvent.isSetLoadReadyEvent(_events));
            assert(!msgEvent.isLoadPreferencesEvent(_events));
            assert(!msgEvent.isLoadTabStateEvent(_events));
            assert(!msgEvent.isSetRemoveNoteReadyEvent(_events));
            assert(!msgEvent.isRemoveNoteEvent(_events));
            assert(!msgEvent.isGoToNoteEvent(_events));
            assert(!msgEvent.isSaveToCategoryEvent(_events));

            assert(msgEvent.isMarkEvent(_events));
            assert(msgEvent.isChangeColourEvent(_events));
            assert(msgEvent.isUnmarkEvent(_events));
            assert(msgEvent.isSetUnmarkReadyEvent(_events));
            assert(msgEvent.isSetSaveReadyEvent(_events));
            assert(msgEvent.isSaveEvent(_events));
            assert(msgEvent.isSetAddNoteReadyEvent(_events));
            assert(msgEvent.isAddNoteEvent(_events));
            assert(msgEvent.isAddNoteLinksEvent(_events));
            assert(msgEvent.isAddCategoriesEvent(_events));
            assert(msgEvent.isEmitEvent(_events));

            assert.deepStrictEqual(msgEvent.getEventName(_events), eventName);
            assert.deepStrictEqual(msgEvent.getMarkColourClass(_events), markColourClass);
            assert.strictEqual(msgEvent.getDefaultCategory(_events), 
                expectedDefaultCategoryTitle);

            assert.deepStrictEqual(msgEvent.getNoteLinks(_events), expectedNoteLinks);
            assert.deepStrictEqual(msgEvent.getCategories(_events), expectedCategoryTitles);
        });
    });
});
