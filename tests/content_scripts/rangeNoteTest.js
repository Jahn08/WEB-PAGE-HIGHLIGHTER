import assert from 'assert';
import { Randomiser } from '../tools/randomiser.js';
import { EnvLoader } from '../tools/envLoader.js';
import { TestPageHelper } from '../tools/testPageHelper.js';
import { RangeNote } from '../../content_scripts/rangeNote.js';

describe('content_script/rangeNote', function () {
    this.timeout(0);

    beforeEach(done => {
        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });

    afterEach(function () {
        if (document.textContentChanged('.' + RangeNote.NOTE_CLASS_NAME) === true)
            this.test.error(new Error('The DOM document text content has been altered'));

        EnvLoader.unloadDomModel();
    });
    
    const createNoteWithText = (targetNode = null, expectedNoteId = '1', 
        text = '' + Randomiser.getRandomNumber(999999999999)) => {
        const noteLink = RangeNote.createNote(text, targetNode);
        assert(noteLink);
        assert.strictEqual(noteLink.id, expectedNoteId);
        
        assert(noteLink.text);
        assert(noteLink.text.includes(text.substring(0, 15)));

        return text;
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
            createNoteWithText(targetNode);

            assert.strictEqual(RangeNote.hasNote(targetNode), true);
        });

        it('should return true for a node with a range note', () => {
            TestPageHelper.setRange(TestPageHelper.setRangeForLastParagraphSentenceNode);
            createNoteWithText();

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
            } else if (targetNode.classList.contains(RangeNote.SOLID_NOTE_CLASS_NAME))
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

            const noteText = createNoteWithText();

            const expectedNoteNodes = [TestPageHelper.getFirstItalicSentenceNode(), TestPageHelper.getLastParagraphSentenceNode()];
            assureNoteValidity(noteText, expectedNoteNodes.map(n => n.textContent));
        });
        
        it('should create notes with same content with partially selected node', () => {
            TestPageHelper.setRange(TestPageHelper.setRangeForPartlySelectedNodes);

            assureNoteValidity(createNoteWithText(), [TestPageHelper.PARTLY_SELECTED_NODES_TEXT]);
        });

        it('should create a note for a focused element', () => {
            const targetNode = TestPageHelper.getFirstItalicSentenceNode();

            assureNoteValidity(createNoteWithText(targetNode), [targetNode.textContent]);
        });

        it('should not create a note inside an element having another note', () => {
            const targetNode = TestPageHelper.getFirstItalicSentenceNode();
            const noteText = createNoteWithText(targetNode.firstChild);

            TestPageHelper.setRange(TestPageHelper.setRangeContainerForSentenceItalic);
            assert(!RangeNote.createNote(Randomiser.getRandomString()));
            assureNoteValidity(noteText, [targetNode.textContent]);
        });
    });

    describe('#removeNote', function () {
        const testFruitlessRemoval = (targetNode) => {
            const nodeWithNote = TestPageHelper.getFirstItalicSentenceNode();
            const expectedNoteText = createNoteWithText(nodeWithNote);

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
            createNoteWithText(targetNode);

            assert.strictEqual(RangeNote.removeNote(targetNode.parentElement), '1');
            assert.strictEqual(document.querySelectorAll('[class*=note]').length, 0);
        };

        it('should remove a note surrounding a text node', () =>
            testRemovingNoteForNode(TestPageHelper.getFirstItalicSentenceNode().firstChild)
        );
        
        it('should remove a note surrounding an element', () =>
            testRemovingNoteForNode(TestPageHelper.getFirstItalicSentenceNode())
        );

        it('should remove a note surrounding several elements', () =>
            testRemovingNoteForNode(TestPageHelper.getLastParagraphSentenceNode())
        );

        it('should remove only a target node note without affecting others', () => {
            const nodeForNoteRemoval = TestPageHelper.getFirstItalicSentenceNode();
            createNoteWithText(nodeForNoteRemoval);

            const residualNoteNode = TestPageHelper.getLastParagraphSentenceNode();
            const residualNoteText = createNoteWithText(residualNoteNode, '2');

            assert.strictEqual(RangeNote.removeNote(nodeForNoteRemoval), '1'); 

            assureNoteValidity(residualNoteText, [residualNoteNode.textContent]);
        });

        it('should remove a target node note and create another note with an incremented id', () => {
            const nodeForNoteRemoval = TestPageHelper.getFirstItalicSentenceNode();
            createNoteWithText(nodeForNoteRemoval);

            createNoteWithText(TestPageHelper.getLastParagraphSentenceNode(), '2');

            assert.strictEqual(RangeNote.removeNote(nodeForNoteRemoval), '1'); 
            createNoteWithText(nodeForNoteRemoval, '3');
        });

        it('should remove a solid note for selection', () => {
            TestPageHelper.setRange(TestPageHelper.setRangeForPartlySelectedItalicSentenceNode);
            assert(RangeNote.createNote(Randomiser.getRandomString()));

            TestPageHelper.setRange(range => 
                TestPageHelper.setRangeForPartlySelectedItalicSentenceNode(range, 31, 37));
            assert.strictEqual(RangeNote.removeNote(), '1');
        });

        it('should remove a range note for selection', () => {
            TestPageHelper.setRange(TestPageHelper.setRangeForEntireNodes);
            assert(RangeNote.createNote(Randomiser.getRandomString()));

            const noteBorderElem = document.getElementsByClassName(RangeNote.START_NOTE_CLASS_NAME)
                .item(0);
            assert(noteBorderElem);
            TestPageHelper.setRange(range => {
                const parentElem = noteBorderElem.parentElement;
                range.setStart(parentElem.previousSibling);
                range.setEnd(parentElem.nextSibling);
            });
            assert.strictEqual(RangeNote.removeNote(), '1');
        });

        it('should not remove a note if it is not in selection', () => {
            TestPageHelper.setRange(TestPageHelper.setRangeForEntireNodes);
            assert(RangeNote.createNote(Randomiser.getRandomString()));

            const noteBorderElem = document.getElementsByClassName(RangeNote.START_NOTE_CLASS_NAME)
                .item(0);
            assert(noteBorderElem);
            TestPageHelper.setRange(range => {
                const elemWithoutNote = noteBorderElem.parentElement.previousSibling;
                range.setStart(elemWithoutNote);
                range.setEnd(elemWithoutNote);
            });
            assert(!RangeNote.removeNote());
        });
    });

    describe('#getNoteLinks', function () {
        
        it('should return an empty array when there are no note links on a page', () => {
            const noteLinks = RangeNote.getNoteLinks();
            assert(noteLinks);
            assert.strictEqual(noteLinks.length, 0);
        });

        it('should return all unique note links existent on a page', () => {
            const firstNoteText = createNoteWithText(TestPageHelper.getFirstItalicSentenceNode());

            const secondNoteId = '2';
            const secondNoteText = createNoteWithText(TestPageHelper.getLastParagraphSentenceNode(), secondNoteId);

            const noteLinks = RangeNote.getNoteLinks();
            assert(noteLinks);
            assert.strictEqual(noteLinks.length, 2);

            assert(noteLinks.find(li => li.id === '1' && li.text.endsWith(firstNoteText)));
            assert(noteLinks.find(li => li.id === secondNoteId && li.text.endsWith(secondNoteText)));
        });

        it('should shorten a too long note link text', () => {
            const longText = ('' + Randomiser.getRandomNumberUpToMax()).padStart(30, '0');
            createNoteWithText(TestPageHelper.getFirstItalicSentenceNode(),
                undefined, longText);

            const noteLinks = RangeNote.getNoteLinks();
            assert.strictEqual(noteLinks.length, 1);

            const noteLink = noteLinks[0];
            assert(noteLink && noteLink.text);
            assert(noteLink.text.length < longText.length);
        });
    });

    describe('#goToNote', function () {
        
        const runCallbackWithMockedScrolling = (callback) => {
            const scrollIntoViewOriginal = Element.prototype.scrollIntoView;

            let scrolledElement;
    
            Element.prototype.scrollIntoView = function() {
                scrolledElement = this;
            };

            callback();

            Element.prototype.scrollIntoView = scrollIntoViewOriginal;

            return scrolledElement;
        };

        it('should scroll towards an existent link note', () => {
            createNoteWithText(
                TestPageHelper.getFirstItalicSentenceNode());

            const secondNoteId = '2';
            const secondNoteText = createNoteWithText(
                TestPageHelper.getLastParagraphSentenceNode(), secondNoteId);
            
            const scrolledElement = runCallbackWithMockedScrolling(() =>
                RangeNote.goToNote(secondNoteId));

            assert(scrolledElement);
            assert.strictEqual(RangeNote.hasNote(scrolledElement), true);
            assert(scrolledElement.textContent.includes(secondNoteText));
        });

        it('should not scroll when there is no passed link note', () =>
            assert(!runCallbackWithMockedScrolling(() => 
                RangeNote.goToNote(Randomiser.getRandomNumber(1000))))
        );
    });
});
