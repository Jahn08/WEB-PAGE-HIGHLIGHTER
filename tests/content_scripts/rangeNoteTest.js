import assert from 'assert';
import { Randomiser } from '../tools/randomiser';
import { EnvLoader } from '../tools/envLoader';
import { TestPageHelper } from '../tools/testPageHelper';

describe('content_script/rangeMarker', function () {
    this.timeout(0);

    before(done => {
        EnvLoader.loadClass('./content_scripts/rangeBase.js', 'RangeBase')
            .then(() => EnvLoader.loadClass('./content_scripts/rangeNote.js', 'RangeNote').then(() => done()))
            .catch(done);
    });

    beforeEach(done => {
        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });

    afterEach(function () {
        if (document.textContentChanged('.' + RangeNote.NOTE_CLASS_NAME) === true)
            this.test.error(new Error('The DOM document text content has been altered'));

        EnvLoader.unloadDomModel();
    });

    const createNoteWithRandomText = (targetNode = null, expectedNoteId = '1') => {
        const noteText = '' + Randomiser.getRandomNumber(999999999999);

        const noteLink = RangeNote.createNote(noteText, targetNode);
        assert(noteLink);
        assert.strictEqual(noteLink.id, expectedNoteId);
        
        assert(noteLink.text);
        assert(noteLink.text.endsWith(noteText));

        return noteText;
    };

    describe('#hasNote', function () {
        
        it('should return false for a node without a note', () =>
            assert.strictEqual(RangeNote.hasNote(TestPageHelper.getFirstItalicSentenceNode()), false)
        );
        
        it('should return false when no node is passed', () =>
            assert.strictEqual(RangeNote.hasNote(null), false)
        );

        it('should return true for a target node with a note', () => {
            const targetNode = TestPageHelper.getFirstItalicSentenceNode();
            createNoteWithRandomText(targetNode);

            assert.strictEqual(RangeNote.hasNote(targetNode), true);
        });

        it('should return true for a node with a range note', () => {
            TestPageHelper.setRange(TestPageHelper.setRangeForLastParagraphSentenceNode);
            createNoteWithRandomText();

            const targetNode = TestPageHelper.getLastParagraphSentenceNode()
                .getElementsByClassName(RangeNote.START_NOTE_CLASS_NAME)[0];
            assert.strictEqual(RangeNote.hasNote(targetNode), true);
        });
    });

    const excludeNotesFromText = (text, noteText) => {
        if (!text.includes(noteText)) 
            return text;

        const regExpFlags = 'gm';

        const matches = new RegExp(`${noteText}.*${noteText}`, regExpFlags)
            .exec(text);
                    
        return (matches && matches.length ? matches[0] : text)
            .replace(new RegExp(noteText, regExpFlags), '').trim();
    };

    const assureNoteValidity = (expectedNoteText, expectedNoteNodeTexts) => {
        const noteElems = [...document.getElementsByClassName(RangeNote.NOTE_CLASS_NAME)];

        assert.strictEqual(noteElems.length, 
            document.getElementsByClassName(RangeNote.SOLID_NOTE_CLASS_NAME).length + 
            [...document.getElementsByClassName(RangeNote.START_NOTE_CLASS_NAME)].length * 2);
        assert(noteElems.every(n => n.innerHTML === expectedNoteText));

        const endNoteNodes = document.getElementsByClassName(RangeNote.END_NOTE_CLASS_NAME);

        let separatedNodeIndex = 0;
        const noteTexts = noteElems.map(node => {
            const targetNode = node.parentElement;

            if (targetNode.classList.contains(RangeNote.START_NOTE_CLASS_NAME)) {
                const range = TestPageHelper.setRange(range => {
                    range.setStart(targetNode);
                    range.setEnd(endNoteNodes.item(separatedNodeIndex++));
                });

                return range.commonAncestorContainer.textContent;
            }
            else if (targetNode.classList.contains(RangeNote.SOLID_NOTE_CLASS_NAME))
                return targetNode.textContent;

            return null;
        }).filter(n => n).join(' ');

        const expectedText = TestPageHelper.removeExcessSpaces(expectedNoteNodeTexts.join(' '));
        const actualtext = TestPageHelper.removeExcessSpaces(noteTexts);
        assert.strictEqual(excludeNotesFromText(actualtext, expectedNoteText), 
            excludeNotesFromText(expectedText, expectedNoteText));
    };

    describe('#createNote', function () {
        it('should do nothing when passing no parameters', () => {
            assert.strictEqual(RangeNote.createNote(), null);
            assert.strictEqual(
                document.getElementsByClassName(RangeNote.HAS_NOTE_CLASS_NAME).length, 0);
        });

        it('should create notes with same content for several ranges with wholy selected nodes', () => {
            TestPageHelper.setMultipleRanges([TestPageHelper.setRangeContainerForSentenceItalic, 
                TestPageHelper.setRangeForLastParagraphSentenceNode]);

            const noteText = createNoteWithRandomText();

            const expectedNoteNodes = [TestPageHelper.getFirstItalicSentenceNode(), TestPageHelper.getLastParagraphSentenceNode()];
            assureNoteValidity(noteText, expectedNoteNodes.map(n => n.textContent));
        });
        
        it('should create notes with same content with partially selected node', () => {
            TestPageHelper.setRange(TestPageHelper.setRangeForPartlySelectedNodes);

            assureNoteValidity(createNoteWithRandomText(), [TestPageHelper.PARTLY_SELECTED_NODES_TEXT]);
        });

        it('should create a note for a focused node', () => {
            const targetNode = TestPageHelper.getFirstItalicSentenceNode();

            assureNoteValidity(createNoteWithRandomText(targetNode), [targetNode.textContent]);
        });
    });

    describe('#removeNote', function () {
        const testFruitlessRemoval = (targetNode) => {
            const nodeWithNote = TestPageHelper.getFirstItalicSentenceNode();
            const expectedNoteText = createNoteWithRandomText(nodeWithNote);

            assert.strictEqual(RangeNote.removeNote(targetNode), null); 

            assureNoteValidity(expectedNoteText, [nodeWithNote.textContent]);
        };

        it('should not affect any notes when no target node is passed', () =>
            testFruitlessRemoval()
        );

        it('should not remove anything with a target node without a note', () =>
            testFruitlessRemoval(TestPageHelper.getLastParagraphSentenceNode())
        );

        const testRemovingNoteForNode = (targetNode) => {
            createNoteWithRandomText(targetNode);

            assert.strictEqual(RangeNote.removeNote(targetNode), '1');
            assert.strictEqual(document.querySelectorAll('[class*=note]').length, 0);
        };

        it('should remove a note surrounding a node', () =>
            testRemovingNoteForNode(TestPageHelper.getFirstItalicSentenceNode())
        );

        it('should remove a note surrounding several nodes', () =>
            testRemovingNoteForNode(TestPageHelper.getLastParagraphSentenceNode())
        );

        it('should remove only a target node note without affecting others', () => {
            const nodeForNoteRemoval = TestPageHelper.getFirstItalicSentenceNode();
            createNoteWithRandomText(nodeForNoteRemoval);

            const residualNoteNode = TestPageHelper.getLastParagraphSentenceNode();
            const residualNoteText = createNoteWithRandomText(residualNoteNode, '2');

            assert.strictEqual(RangeNote.removeNote(nodeForNoteRemoval), '1'); 

            assureNoteValidity(residualNoteText, [residualNoteNode.textContent]);
        });
    });
});
