// eslint-disable-next-line no-unused-vars
class RangeNote extends RangeBase {
    static createNote(text, targetNode = null) {
        const ranges = this._getSelectionRanges();

        if (!text || (!ranges.length && !targetNode))
            return null;

        let maxNoteId = 0;
        
        ArrayExtension.runForEach(
            [...document.getElementsByClassName(this.HAS_NOTE_CLASS_NAME)],
            el => {
                const elNoteId = el.dataset.noteId;

                if (elNoteId > maxNoteId)
                    maxNoteId = Number(elNoteId);
            });

        let success = false;
            
        const noteId = maxNoteId + 1;
        const noteLink = new NoteLink(noteId, text);

        if (ranges.length)
            success = this._appendNoteToRanges(ranges, noteId, text);
        else
            success = this._appendNoteToNode(targetNode, noteId, text);

        return success ? noteLink : null;
    }

    static get START_NOTE_CLASS_NAME() {
        return 'marker-start-note';
    }

    static get NOTE_CLASS_NAME() {
        return 'marker--note';
    }

    static _appendNoteToRanges(ranges, noteId, text) {
        const successfully = this._appendNoteToRangeNodes(ranges, noteId, text);

        ArrayExtension.runForEach(ranges, r => this._collapseRange(r));

        return successfully;
    }

    static _appendNoteToRangeNodes(ranges, noteId, text) {
        if (!ranges || !ranges.length)
            return false;

        return ranges.map(range => {
            const endOffset = range.endOffset;
            const skipLastNode = !endOffset;
    
            const selectedNodes = this._getSelectedTextNodes(range)
                .filter(n => !this._getNoteElement(n));
            const selectionLength = selectedNodes.length;
            if (!selectionLength)
                return false;

            let lastNodeIndex = selectionLength - (skipLastNode ? 1 : 0) - 1;
            lastNodeIndex = lastNodeIndex <= 0 ? 0: lastNodeIndex;
            const isSingleNode = !lastNodeIndex;
    
            if (isSingleNode) {
                const noteNode = this._createSolidContainerNoteNode(noteId, text);

                if ((RangeMarker.getColourClassesForSelectedNodes() || [])[0]) {
                    const pseudoColourClass = this.NOTE_CLASS_NAME + noteId;
                    RangeMarker.markSelectedNodes(pseudoColourClass);
                    const nodeToReplace = document.getElementsByClassName(pseudoColourClass).item(0);

                    if (!nodeToReplace)
                        return false;

                    noteNode.append(nodeToReplace.textContent);
                    nodeToReplace.replaceWith(noteNode);
                }
                else {
                    noteNode.append(range.extractContents());
                    range.insertNode(noteNode);
                }
                
                return true;
            }
        
            const startOffset = range.startOffset;
    
            const firstNode = selectedNodes[0];
            const useFirstNodePartially = startOffset > 0;
    
            const startNoteEl = this._createStartContainerNoteNode(noteId, text);
    
            if (useFirstNodePartially) {
                const val = firstNode.nodeValue;
                firstNode.nodeValue = val.substring(0, startOffset);
    
                const fragment = document.createDocumentFragment();
                fragment.append(startNoteEl, document.createTextNode(val.substring(startOffset)));
                
                firstNode.parentElement.insertBefore(fragment, firstNode.nextSibling);
            }
            else
                firstNode.parentElement.insertBefore(startNoteEl, firstNode);
    
            const lastNode = selectedNodes[lastNodeIndex];
            const useLastNodePartially = endOffset && endOffset !== lastNode.length;
    
            const endNoteEl = this._createEndContainerNoteNode(noteId, text);
    
            if (useLastNodePartially) {
                const val = lastNode.nodeValue;
                lastNode.nodeValue = val.substring(endOffset);
    
                const fragment = document.createDocumentFragment();
                fragment.append(document.createTextNode(val.substring(0, endOffset)), endNoteEl);
                
                lastNode.parentElement.insertBefore(fragment, lastNode);
            }
            else
                lastNode.parentElement.insertBefore(endNoteEl, lastNode.nextSibling);

            return true;
        }).some(result => result);
    }

    static _appendNoteToNode(targetNode, noteId, text) {
        const noteEl = this._createSolidContainerNoteNode(noteId, text);
        targetNode.replaceWith(noteEl);

        noteEl.append(targetNode);

        if (RangeMarker.isNodeMarked(targetNode))
            RangeMarker.unmarkSelectedNodes(targetNode);

        return true;
    }

    static _createStartContainerNoteNode(noteId, text) {
        return this._createContainerNoteNode(noteId, text, [this.START_NOTE_CLASS_NAME]);
    }

    static _createEndContainerNoteNode(noteId, text) {
        return this._createContainerNoteNode(noteId, text, [this.END_NOTE_CLASS_NAME]);
    }

    static get END_NOTE_CLASS_NAME() {
        return 'marker-end-note';
    }

    static _createSolidContainerNoteNode(noteId, text) {
        return this._createContainerNoteNode(noteId, text, [this.SOLID_NOTE_CLASS_NAME]);
    }

    static get SOLID_NOTE_CLASS_NAME() {
        return 'marker-solid-note';
    }
    
    static _createContainerNoteNode(noteId, text, classes = []) {
        const borderNoteNode = document.createElement('span');
        borderNoteNode.classList.add(this.HAS_NOTE_CLASS_NAME, ...classes);
        borderNoteNode.dataset.noteId = noteId;

        const noteNode = document.createElement('span');
        noteNode.classList.add(this.NOTE_CLASS_NAME);
        noteNode.innerHTML = text;

        borderNoteNode.append(noteNode);

        return borderNoteNode;
    }

    static get HAS_NOTE_CLASS_NAME() {
        return 'marker-has-note';
    }

    static hasNote(targetNode) {
        if (this._getNoteElement(targetNode))
            return true;

        const ranges = this._getSelectionRanges();
        if (!ranges || !ranges.length)
            return false;

        return ranges.some(range =>
            this._getSelectedTextNodes(range).some(n => this._getNoteElement(n)));
    }

    static _getNoteElement(targetNode) {
        if (!targetNode)
            return null;
        
        if (this._elementHasNote(targetNode))
            return targetNode;

        const parentElement = targetNode.parentElement;
        
        if (this._elementHasNote(parentElement))
            return parentElement;

        return null;
    }

    static _elementHasNote(targetNode) {
        return targetNode && targetNode.classList && 
            (targetNode.classList.contains(this.HAS_NOTE_CLASS_NAME) || 
                targetNode.classList.contains(this.NOTE_CLASS_NAME));
    }

    static removeNote(targetNode = null) {
        let noteId;
        if (!(noteId = this._extractNoteId(targetNode))) {
            const ranges = this._getSelectionRanges();
            if (!ranges || !ranges.length)
                return null;
    
            const textNodes = this._getSelectedTextNodes(ranges[0]);
            let curNode = textNodes[0];
            const lastNode = textNodes[textNodes.length - 1];
            
            if (!curNode || !lastNode)
                return null;

            do {
                noteId = this._extractNoteId(curNode);
            } while (!noteId && curNode !== lastNode && (curNode = this._nextNode(curNode)));

            if (!noteId)
                return null;
        }

        const noteNodes = [...document.querySelectorAll(this._getNoteSearchSelector(noteId))];
        ArrayExtension.runForEach(noteNodes, 
            n => n.classList.contains(this.SOLID_NOTE_CLASS_NAME) ? this._extractLastChildContent(n):
                n.remove());

        return noteNodes.length > 0 ? noteId : null;        
    }

    static _extractNoteId(node) {
        if (!node)
            return null;

        const noteNode = this._getNoteElement(node);
        return noteNode ? noteNode.dataset.noteId : null;
    } 

    static _getNoteSearchSelector(noteId) {
        return `.marker-has-note[data-note-id="${noteId}"]`;
    }

    static _extractLastChildContent(targetNode) {
        const lastChild = targetNode.lastChild;
        targetNode.replaceWith(lastChild);

        const mergedNode = this._mergeTextNodes(lastChild, lastChild.previousSibling);
        this._mergeTextNodes(mergedNode.nextSibling, mergedNode);
    }

    static _mergeTextNodes(source, target) {
        const textNodeType = Node.TEXT_NODE;

        if (source && source.nodeType === textNodeType && 
            target && target.nodeType === textNodeType) {
            target.textContent += source.textContent;
            source.remove();
            return target;
        }

        return source;
    }

    static goToNote(noteId) {
        let noteElem;

        if (!noteId || !(noteElem = document.querySelector(this._getNoteSearchSelector(noteId))))
            return;

        noteElem.scrollIntoView();
    }

    static getNoteLinks() {
        const uniqueIds = [];
        
        return [...document.getElementsByClassName(this.HAS_NOTE_CLASS_NAME)].map(n => {
            const noteId = n.dataset.noteId;

            if (noteId && !ArrayExtension.contains(uniqueIds, noteId)) {
                uniqueIds.push(noteId);
                return new NoteLink(n.dataset.noteId, n.firstElementChild.textContent);
            }

            return null;
        }).filter(n => n).sort((a, b) => a.id > b.id ? 1 : (a.id < b.id ? -1 : 0));
    }
}

class NoteLink {
    constructor(id, text) {
        this._TEXT_LENGTH_LIMIT = 15;

        this.id = '' + id;
        this.text = this._formatText(id, text);
    }

    _formatText(id, text) {
        return `${id}: ` + (text.length > this._TEXT_LENGTH_LIMIT ? 
            `${text.substring(0, this._TEXT_LENGTH_LIMIT)}...` : 
            text);
    }
}