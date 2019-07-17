import assert from 'assert';
import { Randomiser } from '../tools/randomiser.js';
import { Expectation } from '../tools/expectation.js';
import { EnvLoader } from '../tools/envLoader.js';

describe('content_script/messageControl', function () {
    this.timeout(0);
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/messageControl.js', 'MessageControl')
            .then(() => done())
            .catch(done);
    });

    beforeEach('loadResources', done => {
        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });
    
    afterEach('releaseResources', () => {
        EnvLoader.unloadDomModel();
    });

    const checkMessageControlText = (msgEl, expectedMsg) => {
        const msgLabelEl = msgEl.querySelector('#' + MessageControl.BLANKET_PARAGRAPH_ELEM_ID);
        assert(msgLabelEl);
        assert.strictEqual(msgLabelEl.innerHTML, '' + expectedMsg);
    };

    const getMessageControl = (shouldBePresent = true) => {
        const msgEl = document.getElementById(MessageControl.BLANKET_ELEM_ID);
        assert.strictEqual(msgEl === null, !shouldBePresent);

        return msgEl;
    };

    describe('#show', function () {

        const checkMessageControl = (expectedMsg) => {
            const msgEl = getMessageControl();
            assert(!msgEl.classList.length);

            checkMessageControlText(msgEl, expectedMsg);
        };

        it('should render a message control in DOM', () => {
            const expectedMessage = Randomiser.getRandomNumberUpToMax();
            MessageControl.show(expectedMessage);
            
            checkMessageControl(expectedMessage);
        });

        it('should render a message control, which won\'t disappear after changing the body tag', () => {
            const expectedMessage = Randomiser.getRandomNumberUpToMax();
            MessageControl.show(expectedMessage);
            
            const rootDiv = document.createElement('div');
            rootDiv.innerHTML = Randomiser.getRandomNumberUpToMax();

            document.body.innerHTML = rootDiv.outerHTML;

            checkMessageControl(expectedMessage);
        });

        it('should rerender a text in a message control when showing different messages', () => {
            const initialMessage = Randomiser.getRandomNumberUpToMax();
            MessageControl.show(initialMessage);
            
            const expectedMessage = Randomiser.getRandomNumberUpToMax();
            MessageControl.show(expectedMessage);
            checkMessageControl(expectedMessage);

            assert.strictEqual([...document.querySelectorAll('p')]
                .includes(n => n.innerHTML === initialMessage), false);
        });
    });

    describe('#hide', function () {

        const checkHiddentMessageControl = (expectedMsg) => {
            const msgEl = getMessageControl();
        
            assert.strictEqual(msgEl.classList.length, 2);

            const actualClasses = [...msgEl.classList];
            assert(['disappear', 'leave'].every(ec => 
                actualClasses.filter(ac => ac.endsWith(ec))));

            checkMessageControlText(msgEl, expectedMsg);
        };

        it('should do nothing if there is no message element rendered', () =>
            Expectation.expectResolution(MessageControl.hide(), 
                () => getMessageControl(false))
        );

        const buildHiddenMessageControlText = () => {
            const expectedMessage = Randomiser.getRandomNumberUpToMax();

            MessageControl.show(expectedMessage);            
            return MessageControl.hide().then(() => expectedMessage);
        };

        it('should add hiding classes to an existent message element', () => 
            Expectation.expectResolution(buildHiddenMessageControlText(), 
                expectedMessage => checkHiddentMessageControl(expectedMessage))
        );

        it('should hide an existent message only once', () => {
            return Expectation.expectResolution(
                buildHiddenMessageControlText().then(expectedMessage => { 
                    return MessageControl.hide().then(() => expectedMessage); 
                }),
                expectedMessage => checkHiddentMessageControl(expectedMessage));
        });
    });
});
