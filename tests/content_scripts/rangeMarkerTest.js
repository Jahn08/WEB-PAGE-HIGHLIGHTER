import assert from 'assert';
import { Randomiser } from '../tools/randomiser';
import { EnvLoader } from '../tools/envLoader';
import { TestPageHelper } from '../tools/testPageHelper';

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
                assert(RangeMarker.isNodeMarked(n) === false));
        });

        it('should return true for all marked nodes', function () {
            const italicNodes = document.querySelectorAll('.article--paragraph--sentence--italic');
            italicNodes.forEach(n => {
                n.classList.add(RangeMarker.MARKER_CLASS_NAME);
                assert(RangeMarker.isNodeMarked(n));
            });
        });

        it('should return false for nodes which contain marked children', function () {
            const italicNodes = document.querySelectorAll('.article--paragraph--sentence--italic');
            italicNodes.forEach(n => n.classList.add(RangeMarker.MARKER_CLASS_NAME));

            let markedSentencesCount = 0;

            document.querySelectorAll('.article--paragraph--sentence').forEach(n => {
                if (RangeMarker.isNodeMarked(n)) 
                    ++markedSentencesCount;
            });

            assert.strictEqual(markedSentencesCount, 0);
        });
    });

    const createRandomColourClass = () => `${RangeMarker.MARKER_CLASS_NAME}_${Randomiser.getRandomNumber(1000)}`;

    const markCurSelectionWithRandomColour = (shouldMark = true) => {
        const colourClass = createRandomColourClass();
        assert.strictEqual(RangeMarker.markSelectedNodes(colourClass), shouldMark);

        return colourClass;
    };

    const checkMarkedNodes = function (expectedMarkersNumber, expectedText, 
        colourClass = RangeMarker.MARKER_CLASS_NAME) {
        const markedNodes = [...document.querySelectorAll(`.${colourClass}`)];
        assert.strictEqual(markedNodes.length, expectedMarkersNumber);
        
        let markedText = '';
        
        if (markedNodes.length === 1)
            markedText = markedNodes[0].textContent;
        else if (markedNodes.length > 1)
            markedText = markedNodes.reduce(
                (p, c) => (p.textContent ? p.textContent: p) + c.textContent);

        assert.strictEqual(TestPageHelper.removeExcessSpaces(markedText), expectedText);
        assert.strictEqual(document.querySelectorAll('.' + colourClass).length > 0,
            expectedMarkersNumber ? true: false);
    };

    const markRangeAndCheckColour = (...setRangeContainersCallbacks) => {
        TestPageHelper.setMultipleRanges(setRangeContainersCallbacks);
        
        const colourClass = markCurSelectionWithRandomColour();
        assertRangeColour(colourClass, ...setRangeContainersCallbacks);

        return colourClass;
    };

    const assertRangeColour = (expectedColourClass, ...setRangeContainersCallbacks) => {
        TestPageHelper.setMultipleRanges(setRangeContainersCallbacks).forEach((range, index) => {
            setRangeContainersCallbacks[index](range);

            const markColours = RangeMarker.getColourClassesForSelectedNodes();
            assert(markColours);
            assert.strictEqual(markColours.length, 1);
            assert.strictEqual(markColours[0], expectedColourClass);
    
            range.collapse();
        });
    };

    const getRangeSetterForRemarkingPartially = (colour, startOffset, endOffset) => {
        return (range) => {
            let markedNodes = document.querySelectorAll('.' + RangeMarker.MARKER_CLASS_NAME);
            
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

        const PARTLY_SELECTED_NODE_EXPECTED_TEXT = 'nsions for Firefox ar';

        it('should mark text over partially selected text of the same node', () =>
            testMarking(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode, 1, PARTLY_SELECTED_NODE_EXPECTED_TEXT)
        );

        const ENTIRELY_SELECTED_NODE_EXPECTED_TEXT = 'can extend and modify the capability of a browser. ' + 
            'Extensions for Firefox are built using the WebExtensions API, ' + 
            'a cross-browser system for developing';

        it('should mark text over entirely selected nodes', () =>
            testMarking(TestPageHelper.setRangeForEntireNodes, 5, ENTIRELY_SELECTED_NODE_EXPECTED_TEXT)
        );

        it('should mark over partly selected nodes', () =>
            testMarking(TestPageHelper.setRangeForPartlySelectedNodes, 3, TestPageHelper.PARTLY_SELECTED_NODES_TEXT)
        );

        it('should mark over several selected nodes', () => {
            markRangeAndCheckColour(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode, 
                TestPageHelper.setRangeForLastParagraphSentenceNode);

            const lastPart = TestPageHelper.removeExcessSpaces(TestPageHelper.getLastParagraphSentenceNode().textContent);
            const expectedText = PARTLY_SELECTED_NODE_EXPECTED_TEXT + ' ' + lastPart;
            checkMarkedNodes(4, expectedText);
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
            testMarking(TestPageHelper.setRangeForSeveralParagraphs, SEVERAL_PARAGRAPHS_EXPECTED_NODES, 
                SEVERAL_PARAGRAPHS_EXPECTED_TEXT)
        );

        it('should change colour for partly selected nodes in different paragraphs', () => {
            assert.notStrictEqual(markRangeAndCheckColour(TestPageHelper.setRangeForSeveralParagraphs), 
                markRangeAndCheckColour(TestPageHelper.setRangeForSeveralParagraphs));

            checkMarkedNodes(SEVERAL_PARAGRAPHS_EXPECTED_NODES, SEVERAL_PARAGRAPHS_EXPECTED_TEXT);
        });

        const testMarkingPartiallyOverMarkedNode = (expectedText, 
            startOffset = PARTIAL_REMARKING_START_OFFSET, 
            endOffset = PARTIAL_REMARKING_END_OFFSET) => {
            const curColour = markRangeAndCheckColour(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode);
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
            const curColour = markRangeAndCheckColour(TestPageHelper.setRangeForSeveralParagraphs);
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

    describe('#unmarkSelectedNodes', function () {
        it('should do nothing with neither selected text nor a focused node', () => {
            assert.strictEqual(RangeMarker.unmarkSelectedNodes(), false);
            checkMarkedNodes(0, '');
        });

        it('should do nothing with a selected unmarked text', () => {
            const expectedColour = markRangeAndCheckColour(TestPageHelper.setRangeContainerForSentence);

            TestPageHelper.setRange(TestPageHelper.setRangeContainerForSentenceItalic);
            assert.strictEqual(RangeMarker.unmarkSelectedNodes(), false);

            assertRangeColour(expectedColour, TestPageHelper.setRangeContainerForSentence);
        });

        it('should do nothing with a selected unmarked node', () => {
            const expectedColour = markRangeAndCheckColour(TestPageHelper.setRangeContainerForSentence);
            assert.strictEqual(RangeMarker.unmarkSelectedNodes(TestPageHelper.getFirstItalicSentenceNode()), 
                false);
            
            assertRangeColour(expectedColour, TestPageHelper.setRangeContainerForSentence);
        });

        const testUnmarking = function (setRangeContainersCallback, targetNode = null) {
            markRangeAndCheckColour(setRangeContainersCallback);

            if (!targetNode)
                TestPageHelper.setRange(setRangeContainersCallback);
            
            assert.strictEqual(RangeMarker.unmarkSelectedNodes(targetNode), true);
            checkMarkedNodes(0, '');
        };

        it('should unmark text over entirely selected nodes', () =>
            testUnmarking(TestPageHelper.setRangeForEntireNodes));

        it('should unmark over partly selected nodes', () =>
            testUnmarking(TestPageHelper.setRangeForPartlySelectedNodes));

        it('should unmark over partly selected nodes in different paragraphs', () =>
            testUnmarking(TestPageHelper.setRangeForSeveralParagraphs));
    
        it('should remove colour for a focused node', () =>
            testUnmarking(TestPageHelper.setRangeContainerForSentence, TestPageHelper.getFirstSentenceNode()));

        it('should unmark text over partially selected text of the same node', () => {
            testUnmarking(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode);
        });

        const testUnmarkingPartiallyOverMarkedNode = (
            expectedResidualMarkedText, 
            startOffset = PARTIAL_REMARKING_START_OFFSET, 
            endOffset = PARTIAL_REMARKING_END_OFFSET) => {
            
            const curColour = markRangeAndCheckColour(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode);
            TestPageHelper.setRange(getRangeSetterForRemarkingPartially(curColour, startOffset, endOffset));
            
            assert.strictEqual(RangeMarker.unmarkSelectedNodes(), true);

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
            TestPageHelper.setRange(range => 
                TestPageHelper.setRangeContainer(range, document.getElementById('article--paragraph-first')));
        };

        it('should unmark text over several marked texts in the same range', () => {
            markRangeAndCheckColour(TestPageHelper.setRangeContainerForSentence);
            markRangeAndCheckColour(TestPageHelper.setRangeContainerForSentenceItalic);

            setRangeForFirstParagraph();

            RangeMarker.unmarkSelectedNodes();
            checkMarkedNodes(0, '');
        });

        it('should unmark text over several marked texts in a few ranges', () => {
            markRangeAndCheckColour(TestPageHelper.setRangeContainerForSentence, 
                TestPageHelper.setRangeContainerForSentenceItalic);

            TestPageHelper.setMultipleRanges([TestPageHelper.setRangeContainerForSentence, 
                TestPageHelper.setRangeContainerForSentenceItalic]);
            RangeMarker.unmarkSelectedNodes();

            checkMarkedNodes(0, '');
        });

        it('should remove all empty marker containers while unmarking', () => {
            markRangeAndCheckColour(TestPageHelper.setRangeContainerForSentence);

            setRangeForFirstParagraph();

            const expectedTokens = [];

            for (let i = 0; i < 5; ++i) {
                const emptyMarker = document.createElement('div');
                emptyMarker.className = RangeMarker.MARKER_CLASS_NAME;

                if (i % 2 === 0) {
                    emptyMarker.innerHTML = Randomiser.getRandomNumberUpToMax();
                    expectedTokens.push(emptyMarker.innerHTML);
                }
                
                document.body.append(emptyMarker);
            }

            RangeMarker.unmarkSelectedNodes();
            
            const markers = [...document.getElementsByClassName(RangeMarker.MARKER_CLASS_NAME)];
            assert.strictEqual(markers.length, expectedTokens.length);
            assert(markers.every(m => expectedTokens.includes(m.innerHTML)));

            markers.forEach(m => m.remove());
        });
    });

    describe('#changeSelectedNodesColour', function () {
        it('should do nothing with neither selected text nor a focused node', () => {
            assert.strictEqual(RangeMarker.changeSelectedNodesColour(createRandomColourClass()), 
                false);
            checkMarkedNodes(0, '');
        });
        
        const assureChangingColourOverRange = (colour = createRandomColourClass(), ...setRangeContainersCallbacks) => {
            TestPageHelper.setMultipleRanges(setRangeContainersCallbacks);
            assert.strictEqual(RangeMarker.changeSelectedNodesColour(colour), true);

            return colour;
        };

        it('should mark selected unmarked text with a changed colour', () => {
            const oldColour = markRangeAndCheckColour(TestPageHelper.setRangeContainerForSentence);

            const newColour = assureChangingColourOverRange(undefined, TestPageHelper.setRangeContainerForSentenceItalic);
            assertRangeColour(oldColour, TestPageHelper.setRangeContainerForSentence);
            assertRangeColour(newColour, TestPageHelper.setRangeContainerForSentenceItalic);
        });

        it('should mark a few selected unmarked texts with a changed colour', () => {
            const newColour = assureChangingColourOverRange(undefined, TestPageHelper.setRangeContainerForSentenceItalic, 
                TestPageHelper.setRangeContainerForSentence);
            assertRangeColour(newColour, TestPageHelper.setRangeContainerForSentenceItalic, 
                TestPageHelper.setRangeContainerForSentence);
        });

        it('should do nothing with a selected unmarked node', () => {
            const expectedColour = markRangeAndCheckColour(TestPageHelper.setRangeContainerForSentence);
            
            assert.strictEqual(RangeMarker.changeSelectedNodesColour(createRandomColourClass(),
                TestPageHelper.getFirstItalicSentenceNode()), false);

            assertRangeColour(expectedColour, TestPageHelper.setRangeContainerForSentence);
        });

        it('should change colour for a selected text', () => {
            const expectedColour = createRandomColourClass();
            assert.notStrictEqual(markRangeAndCheckColour(TestPageHelper.setRangeForSeveralParagraphs), expectedColour);
           
            assureChangingColourOverRange(expectedColour, TestPageHelper.setRangeForSeveralParagraphs);
            assertRangeColour(expectedColour, TestPageHelper.setRangeForSeveralParagraphs);
        });

        it('should change colour for a focused node', () => {
            const expectedColour = createRandomColourClass();
            const initialColour = markRangeAndCheckColour(TestPageHelper.setRangeContainerForSentence);
            
            assert.notStrictEqual(initialColour, expectedColour);

            assert.strictEqual(
                RangeMarker.changeSelectedNodesColour(expectedColour, TestPageHelper.getFirstSentenceNode()),
                true);
            assertRangeColour(expectedColour, TestPageHelper.setRangeContainerForSentence);
        });

        it('should partially change colour in the middle of already marked text', () => {
            const curColour = markRangeAndCheckColour(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode);
            const newColour = assureChangingColourOverRange(undefined, getRangeSetterForRemarkingPartially(
                curColour, PARTIAL_REMARKING_START_OFFSET, PARTIAL_REMARKING_END_OFFSET));

            checkMarkedNodes(1, 's for Fir', newColour);
        });
        
        it('should change colour for several marked texts', () => {
            markRangeAndCheckColour(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode); 
            const curColour = markRangeAndCheckColour(TestPageHelper.setRangeContainerForSentence, 
                TestPageHelper.setRangeForLastParagraphSentenceNode);
            
            const partlyMarkedRangeSetter = getRangeSetterForRemarkingPartially(curColour, 
                PARTIAL_REMARKING_START_OFFSET, PARTIAL_REMARKING_END_OFFSET);

            const newColour = assureChangingColourOverRange(undefined, partlyMarkedRangeSetter, 
                TestPageHelper.setRangeForLastParagraphSentenceNode, TestPageHelper.setRangeContainerForSentence);

            const firstPart = TestPageHelper.removeExcessSpaces(TestPageHelper.getFirstSentenceNode().textContent);
            const lastPart = TestPageHelper.removeExcessSpaces(TestPageHelper.getLastParagraphSentenceNode().textContent);
            checkMarkedNodes(7, `${firstPart} s for Fir ${lastPart}`, newColour);
        });
    });
});
