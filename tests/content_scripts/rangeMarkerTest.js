import assert from 'assert';
import { Randomiser } from '../tools/randomiser';
import { EnvLoader } from '../tools/envLoader';

describe('content_script/rangeMarker', function () {
    this.timeout(0);

    before(done => {
        EnvLoader.loadClass('./content_scripts/rangeBase.js', 'RangeBase')
            .then(() => EnvLoader.loadClass('./content_scripts/rangeMarker.js', 'RangeMarker').then(() => done()))
            .catch(done);
    });

    beforeEach(done => {
        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });

    afterEach(function () {
        if (document.textContentChanged() === true)
            this.test.error(new Error('The DOM document text content has been altered'));

        EnvLoader.unloadDomModel();
    });

    describe('#isNodeMarked', function () {
        it('should return false for all unmarked nodes', function () {
            document.querySelectorAll('.article--paragraph--sentence--label').forEach(n => 
                assert(global.RangeMarker.isNodeMarked(n) === false));
        });

        it('should return true for all marked nodes', function () {
            const italicNodes = document.querySelectorAll('.article--paragraph--sentence--italic');
            italicNodes.forEach(n => {
                n.classList.add(global.RangeMarker.markerClass);
                assert(global.RangeMarker.isNodeMarked(n));
            });
        });

        it('should return false for nodes which contain marked children', function () {
            const italicNodes = document.querySelectorAll('.article--paragraph--sentence--italic');
            italicNodes.forEach(n => n.classList.add(global.RangeMarker.markerClass));

            let markedSentencesCount = 0;

            document.querySelectorAll('.article--paragraph--sentence').forEach(n => {
                if (global.RangeMarker.isNodeMarked(n)) 
                    ++markedSentencesCount;
            });

            assert.strictEqual(markedSentencesCount, 0);
        });
    });

    const createRandomColourClass = () => `${global.RangeMarker.markerClass}_${Randomiser.getRandomNumber(1000)}`;

    const markCurSelectionWithRandomColour = (shouldMark = true) => {
        const colourClass = createRandomColourClass();
        assert.strictEqual(global.RangeMarker.markSelectedNodes(colourClass), shouldMark);

        return colourClass;
    };

    const checkMarkedNodes = function (expectedMarkersNumber, expectedText, 
        colourClass = global.RangeMarker.markerClass) {
        const markedNodes = [...document.querySelectorAll(`.${colourClass}`)];
        assert.strictEqual(markedNodes.length, expectedMarkersNumber);
        
        let markedText = '';
        
        if (markedNodes.length === 1)
            markedText = markedNodes[0].textContent;
        else if (markedNodes.length > 1)
            markedText = markedNodes.reduce(
                (p, c) => (p.textContent ? p.textContent: p) + c.textContent);

        assert.strictEqual(markedText.replace(/\s+/gm, ' ').trim(), expectedText);
        assert.strictEqual(document.querySelectorAll('.' + colourClass).length > 0,
            expectedMarkersNumber ? true: false);
    };

    const setRange = setRangeContainersCallback => setRangeContainersCallback(document.createRange());

    const markRangeAndCheckColour = setRangeContainersCallback => {
        setRange(setRangeContainersCallback);
        
        const colourClass = markCurSelectionWithRandomColour();
        assertRangeColour(setRangeContainersCallback, colourClass);

        return colourClass;
    };

    const assertRangeColour = (setRangeContainersCallback, expectedColourClass) => {
        const range = document.createRange();
        setRangeContainersCallback(range);

        const markColours = global.RangeMarker.getColourClassesForSelectedNodes();
        assert(markColours);
        assert.strictEqual(markColours.length, 1);
        assert.strictEqual(markColours[0], expectedColourClass);

        range.collapse();
    };

    const setRangeForEntireNodes = range => {
        range.setStart(document.querySelector('.article--paragraph--sentence--label'));
        range.setEnd(document.querySelector('.article--paragraph--sentence--bold--italic'));    
    };

    const getFirstItalicSentenceNode = () => document.querySelector('.article--paragraph--sentence--italic');
    
    const setRangeForPartlySelectedItalicSentenceNode = range => {
        const italicNode = getFirstItalicSentenceNode();
        range.setStart(italicNode, 29);
        range.setEnd(italicNode, 50);
    };

    const setRangeForPartlySelectedNodes = range => {
        range.setStart(getFirstItalicSentenceNode(), 37);
        range.setEnd(document.querySelector('.article--paragraph--sentence--bold--italic'), 37);   
    };

    const getLastParagraphSentenceNode = () => 
        document.querySelector('#article--paragraph-last .article--paragraph--sentence');

    const setRangeForSeveralParagraphs = range => {
        range.setStart(getFirstItalicSentenceNode(), 26);
        range.setEnd(getLastParagraphSentenceNode(), 30);
    };

    const getRangeSetterForRemarkingPartially = (colour, startOffset, endOffset) => {
        return (range) => {
            let markedNodes = document.querySelectorAll('.' + global.RangeMarker.markerClass);
            
            const newColourNodes = [...markedNodes].filter(n => !n.classList.contains(colour));

            if (newColourNodes.length) 
                markedNodes = newColourNodes;
            
            const firstTargetNode = markedNodes[0];
            const lastTargetNode = markedNodes[markedNodes.length - 1];
                
            assert(firstTargetNode);
            assert(lastTargetNode);

            range.setStart(firstTargetNode, startOffset);
            range.setEnd(lastTargetNode, endOffset);
        };
    };

    const PARTIAL_REMARKING_START_OFFSET = 5;
    const PARTIAL_REMARKING_END_OFFSET = 14;

    describe('#markSelectedNodes', function () {
        it('should do nothing without any selected text', () => {
            markCurSelectionWithRandomColour(false);
            checkMarkedNodes(0, '');
        });

        const testMarking = function (setRangeContainersCallback, expectedMarkersNumber, expectedText) {
            markRangeAndCheckColour(setRangeContainersCallback);
            checkMarkedNodes(expectedMarkersNumber, expectedText);
        };

        it('should mark text over partially selected text of the same node', () =>
            testMarking(setRangeForPartlySelectedItalicSentenceNode, 1, 'nsions for Firefox ar')
        );

        it('should mark text over entirely selected nodes', () =>
            testMarking(setRangeForEntireNodes, 5, 
                'can extend and modify the capability of a browser. ' + 
                'Extensions for Firefox are built using the WebExtensions API, ' + 
                'a cross-browser system for developing')
        );

        it('should mark over partly selected nodes', () => {
            testMarking(setRangeForPartlySelectedNodes, 3, 
                'or Firefox are built using the WebExtensions API, a cross-browser system f');
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
                SEVERAL_PARAGRAPHS_EXPECTED_TEXT)
        );

        it('should change colour for partly selected nodes in different paragraphs', () => {
            assert.notStrictEqual(markRangeAndCheckColour(setRangeForSeveralParagraphs), 
                markRangeAndCheckColour(setRangeForSeveralParagraphs));

            checkMarkedNodes(SEVERAL_PARAGRAPHS_EXPECTED_NODES, SEVERAL_PARAGRAPHS_EXPECTED_TEXT);
        });

        const testMarkingPartiallyOverMarkedNode = (expectedText, 
            startOffset = PARTIAL_REMARKING_START_OFFSET, 
            endOffset = PARTIAL_REMARKING_END_OFFSET) => {
            const curColour = markRangeAndCheckColour(setRangeForPartlySelectedItalicSentenceNode);
            const newColour = markRangeAndCheckColour(getRangeSetterForRemarkingPartially(
                curColour, startOffset, endOffset));

            checkMarkedNodes(1, expectedText, newColour);
        };

        it('should partially remark in the middle of already marked text', () =>
            testMarkingPartiallyOverMarkedNode('s for Fir'));

        it('should partially remark over the first half of already marked text', () =>
            testMarkingPartiallyOverMarkedNode('nsions for Fir', null));

        it('should partially remark over the last half of already marked text', () =>
            testMarkingPartiallyOverMarkedNode('s for Firefox ar', undefined, null));

        it('should partially remark over marked text in different paragraphs', () => {
            const curColour = markRangeAndCheckColour(setRangeForSeveralParagraphs);
            const newColour = markRangeAndCheckColour(getRangeSetterForRemarkingPartially(
                curColour, 15, 25));

            checkMarkedNodes(SEVERAL_PARAGRAPHS_EXPECTED_NODES, 
                'irefox are built using the WebExtensions API, ' + 
                'a cross-browser system for developing extensions. ' + 
                'To a large extent the system is compatible with the extension ' + 
                'API supported by Google Chrome and Opera and the W3C ' + 
                'Draft Community Group. Extensions written for these browsers ' + 
                'will in most cases run in Firefox or Microsoft Edge with', newColour);
        });
    });

    const getFirstSentenceNode = () => document.querySelector('.article--paragraph--sentence');

    const setRangeContainer = (range, sentenceElem) => {
        range.setStart(sentenceElem);
        range.setEnd(sentenceElem);
    };

    const setRangeContainerForSentence = range => setRangeContainer(range, getFirstSentenceNode());

    const setRangeContainerForSentenceItalic = range => setRangeContainer(range, 
        getFirstItalicSentenceNode());

    describe('#unmarkSelectedNodes', function () {
        it('should do nothing with neither selected text nor a focused node', () => {
            assert.strictEqual(global.RangeMarker.unmarkSelectedNodes(), false);
            checkMarkedNodes(0, '');
        });

        it('should do nothing with a selected unmarked text', () => {
            const expectedColour = markRangeAndCheckColour(setRangeContainerForSentence);

            setRange(setRangeContainerForSentenceItalic);
            assert.strictEqual(global.RangeMarker.unmarkSelectedNodes(), false);

            assertRangeColour(setRangeContainerForSentence, expectedColour);
        });

        it('should do nothing with a selected unmarked node', () => {
            const expectedColour = markRangeAndCheckColour(setRangeContainerForSentence);
            assert.strictEqual(global.RangeMarker.unmarkSelectedNodes(getFirstItalicSentenceNode()), 
                false);
            
            assertRangeColour(setRangeContainerForSentence, expectedColour);
        });

        const testUnmarking = function (setRangeContainersCallback, targetNode = null) {
            markRangeAndCheckColour(setRangeContainersCallback);

            if (!targetNode)
                setRange(setRangeContainersCallback);
            
            assert.strictEqual(global.RangeMarker.unmarkSelectedNodes(targetNode), true);
            checkMarkedNodes(0, '');
        };

        it('should unmark text over entirely selected nodes', () =>
            testUnmarking(setRangeForEntireNodes));

        it('should unmark over partly selected nodes', () =>
            testUnmarking(setRangeForPartlySelectedNodes));

        it('should unmark over partly selected nodes in different paragraphs', () =>
            testUnmarking(setRangeForSeveralParagraphs));
    
        it('should remove colour for a focused node', () =>
            testUnmarking(setRangeContainerForSentence, getFirstSentenceNode()));

        it('should unmark text over partially selected text of the same node', () => {
            testUnmarking(setRangeForPartlySelectedItalicSentenceNode);
        });

        const testUnmarkingPartiallyOverMarkedNode = (
            expectedResidualMarkedText, 
            startOffset = PARTIAL_REMARKING_START_OFFSET, 
            endOffset = PARTIAL_REMARKING_END_OFFSET) => {
            
            const curColour = markRangeAndCheckColour(setRangeForPartlySelectedItalicSentenceNode);
            setRange(getRangeSetterForRemarkingPartially(curColour, startOffset, endOffset));
            
            assert.strictEqual(global.RangeMarker.unmarkSelectedNodes(), true);

            checkMarkedNodes(startOffset && endOffset ? 2 : 1, 
                expectedResidualMarkedText, curColour);
        };

        it('should partially unmark in the middle of already marked text', () =>
            testUnmarkingPartiallyOverMarkedNode('nsionefox ar'));

        it('should partially unmark over the first half of already marked text', () =>
            testUnmarkingPartiallyOverMarkedNode('efox ar', null));

        it('should partially unmark over the last half of already marked text', () =>
            testUnmarkingPartiallyOverMarkedNode('nsion', undefined, null));

        const setRangeForFirstParagraph = () => {
            setRange(range => 
                setRangeContainer(range, document.getElementById('article--paragraph-first')));
        };

        it('should unmark text over several marked texts', () => {
            markRangeAndCheckColour(setRangeContainerForSentence);
            markRangeAndCheckColour(setRangeContainerForSentenceItalic);

            setRangeForFirstParagraph();

            global.RangeMarker.unmarkSelectedNodes();
            checkMarkedNodes(0, '');
        });

        it('should remove all empty marker containers while unmarking', () => {
            markRangeAndCheckColour(setRangeContainerForSentence);

            setRangeForFirstParagraph();

            const expectedTokens = [];

            for (let i = 0; i < 5; ++i) {
                const emptyMarker = document.createElement('div');
                emptyMarker.className = global.RangeMarker.markerClass;

                if (i % 2 === 0) {
                    emptyMarker.innerHTML = Randomiser.getRandomNumberUpToMax();
                    expectedTokens.push(emptyMarker.innerHTML);
                }
                
                document.body.append(emptyMarker);
            }

            global.RangeMarker.unmarkSelectedNodes();
            
            const markers = [...document.getElementsByClassName(global.RangeMarker.markerClass)];
            assert.strictEqual(markers.length, expectedTokens.length);
            assert(markers.every(m => expectedTokens.includes(m.innerHTML)));

            markers.forEach(m => m.remove());
        });
    });

    describe('#changeSelectedNodesColour', function () {
        it('should do nothing with neither selected text nor a focused node', () => {
            assert.strictEqual(global.RangeMarker.changeSelectedNodesColour(createRandomColourClass()), 
                false);
            checkMarkedNodes(0, '');
        });
        
        const changeColourOverRange = (setRangeContainersCallback, 
            colour = createRandomColourClass(), shouldChangeColour = true) => {
            setRange(setRangeContainersCallback);
            assert.strictEqual(global.RangeMarker.changeSelectedNodesColour(colour), shouldChangeColour);

            return colour;
        };

        it('should mark selected unmarked text with a changed colour', () => {
            const oldColour = markRangeAndCheckColour(setRangeContainerForSentence);

            const newColour = changeColourOverRange(setRangeContainerForSentenceItalic, undefined, true);
            assertRangeColour(setRangeContainerForSentence, oldColour);
            assertRangeColour(setRangeContainerForSentenceItalic, newColour);
        });

        it('should do nothing with a selected unmarked node', () => {
            const expectedColour = markRangeAndCheckColour(setRangeContainerForSentence);
            
            assert.strictEqual(global.RangeMarker.changeSelectedNodesColour(createRandomColourClass(),
                getFirstItalicSentenceNode()), false);

            assertRangeColour(setRangeContainerForSentence, expectedColour);
        });

        it('should change colour for a selected text', () => {
            const expectedColour = createRandomColourClass();
            assert.notStrictEqual(markRangeAndCheckColour(setRangeForSeveralParagraphs), expectedColour);
           
            changeColourOverRange(setRangeForSeveralParagraphs, expectedColour);
            assertRangeColour(setRangeForSeveralParagraphs, expectedColour);
        });

        it('should change colour for a focused node', () => {
            const expectedColour = createRandomColourClass();
            const initialColour = markRangeAndCheckColour(setRangeContainerForSentence);
            
            assert.notStrictEqual(initialColour, expectedColour);

            assert.strictEqual(
                global.RangeMarker.changeSelectedNodesColour(expectedColour, getFirstSentenceNode()),
                true);
            assertRangeColour(setRangeContainerForSentence, expectedColour);
        });

        it('should partially change colour in the middle of already marked text', () => {
            const curColour = markRangeAndCheckColour(setRangeForPartlySelectedItalicSentenceNode);
            const newColour = changeColourOverRange(getRangeSetterForRemarkingPartially(
                curColour, PARTIAL_REMARKING_START_OFFSET, PARTIAL_REMARKING_END_OFFSET));

            checkMarkedNodes(1, 's for Fir', newColour);
        });
    });
});
