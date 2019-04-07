import assert from 'assert';
import { Randomiser } from '../tools/randomiser';
import { EnvLoader } from '../tools/envLoader';

describe('content_script/rangeMarker', function () {
    this.timeout(0);

    before(done => {
        EnvLoader.loadClass('./content_scripts/rangeMarker.js', 'RangeMarker')
            .then(() => done())
            .catch(done);
    });

    beforeEach(done => {
        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });
    
    afterEach(done => {
        EnvLoader.unloadDomModel();
        done();
    });

    describe('#isNodeMarked', () =>
        it('should determine if nodes are marked or not', function () {
            const rangeMarker = new RangeMarker();
            
            document.querySelectorAll('.article--paragraph--sentence--label').forEach(n => 
                assert(rangeMarker.isNodeMarked(n) === false));

            const italicNodes = document.querySelectorAll('.article--paragraph--sentence--italic');
            italicNodes.forEach(n => {
                n.classList.add(RangeMarker.markerClass);
                assert(rangeMarker.isNodeMarked(n) === true);
            });

            let markedSentencesCount = 0;

            document.querySelectorAll('.article--paragraph--sentence').forEach(n => {
                if (rangeMarker.isNodeMarked(n)) 
                    ++markedSentencesCount;
            });

            assert.strictEqual(markedSentencesCount, italicNodes.length);
        })
    );

    const createRandomColourClass = () => `${RangeMarker.markerClass}_${Randomiser.getRandomNumber(1000)}`;

    const markCurSelectionWithRandomColour = (rangeMarker = new RangeMarker()) => {
        const colourClass = createRandomColourClass();
        rangeMarker.markSelectedNodes(colourClass);

        return colourClass;
    };

    const checkMarkedNodes = function (expectedMarkersNumber, expectedText) {
        const markedNodes = [...document.querySelectorAll(`.${RangeMarker.markerContainerClass} .${RangeMarker.markerClass}`)];
        assert.strictEqual(markedNodes.length, expectedMarkersNumber);
        
        const markedText = markedNodes.length ? markedNodes.reduce((p, c) => 
            (p.textContent ? p.textContent: p) + c.textContent): '';

        assert.strictEqual(markedText.replace(/\s+/gm, ' ').trim(), expectedText);
    };

    const setRange = setRangeContainersCallback => setRangeContainersCallback(document.createRange());

    const markRange = (setRangeContainersCallback) => {
        setRange(setRangeContainersCallback);
        return markCurSelectionWithRandomColour();
    };

    const markRangeAndCheckColour = setRangeContainersCallback => {
        const colourClass = markRange(setRangeContainersCallback);
        assertRangeColour(setRangeContainersCallback, colourClass);

        return colourClass;
    };

    const assertRangeColour = (setRangeContainersCallback, expectedColourClass) => {
        setRangeContainersCallback(document.createRange());

        const markColours = new RangeMarker().getColourClassesForSelectedNodes();
        assert(markColours);
        assert.strictEqual(markColours.length, 1);
        assert.strictEqual(markColours[0], expectedColourClass);
    };

    const setRangeForSeveralParagraphs = range => {
        range.setStart(document.querySelector('.article--paragraph--sentence--italic'), 26);
        range.setEnd(document.querySelector('#article--paragraph-last .article--paragraph--sentence'), 30);
    };

    describe('#markSelectedNodes', function () {
        it('should do nothing without any selected text', () => {
            markCurSelectionWithRandomColour();
            checkMarkedNodes(0, '');
        });

        const testMarking = function (setRangeContainersCallback, expectedMarkersNumber, expectedText) {
            markRangeAndCheckColour(setRangeContainersCallback);
            checkMarkedNodes(expectedMarkersNumber, expectedText);
        };

        it('should mark text over entirely selected nodes', () =>
            testMarking(range => {
                range.setStart(document.querySelector('.article--paragraph--sentence--label'));
                range.setEnd(document.querySelector('.article--paragraph--sentence--bold--italic'));
            }, 5, 'can extend and modify the capability of a browser. ' + 
                'Extensions for Firefox are built using the WebExtensions API, ' + 
                'a cross-browser system for developing')
        );

        it('should mark over partly selected nodes', () => {
            testMarking(range => {
                range.setStart(document.querySelector('.article--paragraph--sentence--italic'), 37);
                range.setEnd(document.querySelector('.article--paragraph--sentence--bold--italic'), 37);
            }, 3, 'or Firefox are built using the WebExtensions API, a cross-browser system f')
        });

        const SEVERAL_PARAGRAPHS_EXPECTED_NODES = 9;
        const SEVERAL_PARAGRAPHS_EXPECTED_TEXT = 
            'xtensions for Firefox are built using the WebExtensions API, ' + 
            'a cross-browser system for developing extensions. ' + 
            'To a large extent the system is compatible with the extension ' + 
            'API supported by Google Chrome and Opera and the W3C ' + 
            'Draft Community Group. Extensions written for these browsers ' + 
            'will in most cases run in Firefox or Microsoft Edge with just';

        it('should mark over partly selected nodes in different paragraphs', () =>
            testMarking(setRangeForSeveralParagraphs, SEVERAL_PARAGRAPHS_EXPECTED_NODES, 
                SEVERAL_PARAGRAPHS_EXPECTED_TEXT));

        it('should change colour for partly selected nodes in different paragraphs', () => {
            assert.notStrictEqual(markRangeAndCheckColour(setRangeForSeveralParagraphs), 
                markRangeAndCheckColour(setRangeForSeveralParagraphs));

            checkMarkedNodes(SEVERAL_PARAGRAPHS_EXPECTED_NODES, SEVERAL_PARAGRAPHS_EXPECTED_TEXT);
        });
    });

    describe('#changeSelectedNodesColour', function () {
        it('should do nothing with neither selected text or a focused node', () => {
            new RangeMarker().changeSelectedNodesColour(createRandomColourClass());
            checkMarkedNodes(0, '');
        });
        
        const getFirstSentenceNode = () => document.querySelector('.article--paragraph--sentence');

        const setRangeContainerForSentence = range => {
            const sentenceElem = getFirstSentenceNode();
            range.setStart(sentenceElem);
            range.setEnd(sentenceElem);
        };

        it('should do nothing with a selected unmarked text', () => {
            const expectedColour = markRange(setRangeContainerForSentence);

            setRange(range => {
                const italicElem = document.querySelector('.article--paragraph--sentence--italic');
                range.setStart(italicElem);
                range.setEnd(italicElem);
            });
            new RangeMarker().changeSelectedNodesColour(createRandomColourClass());

            assertRangeColour(setRangeContainerForSentence, expectedColour);
        });

        it('should do nothing with a selected unmarked node', () => {
            const expectedColour = markRange(setRangeContainerForSentence);
            new RangeMarker().changeSelectedNodesColour(createRandomColourClass(),
                document.querySelector('.article--paragraph--sentence--italic'));

            assertRangeColour(setRangeContainerForSentence, expectedColour);
        });

        it('should change colour for a selected text', () => {
            const expectedColour = createRandomColourClass();
            assert.notStrictEqual(markRange(setRangeForSeveralParagraphs), expectedColour);
            
            setRange(setRangeForSeveralParagraphs);
            new RangeMarker().changeSelectedNodesColour(expectedColour);
            assertRangeColour(setRangeForSeveralParagraphs, expectedColour);
        });

        it('should change colour for a focused node', () => {
            const expectedColour = createRandomColourClass();
            const initialColour = markRange(setRangeContainerForSentence);
            
            assert.notStrictEqual(initialColour, expectedColour);

            new RangeMarker().changeSelectedNodesColour(expectedColour, getFirstSentenceNode());
            assertRangeColour(setRangeContainerForSentence, expectedColour);
        });
    });
});
