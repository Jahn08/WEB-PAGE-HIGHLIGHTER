class RangeNote extends RangeBase {
    static hasSelectionRange() {
        return this._getSelectionRange() !== null;
    }

    static createNote(text, targetNode = null) {
        const ranges = this._getSelectionRanges();

        if (!text || (!ranges.length && !targetNode))
            return false;

        const noteId = document.querySelectorAll(`.${this.START_NOTE_CLASS_NAME},.${this.SOLID_NOTE_CLASS_NAME}`).length + 1;

        if (ranges.length)
            return this._appendNoteToRanges(ranges, noteId, text);

        return this._appendNoteToNode(targetNode, noteId, text);
    }

    static get START_NOTE_CLASS_NAME() {
        return 'marker-start-note';
    }

    static get NOTE_CLASS_NAME() {
        return 'marker--note';
    }

    static _appendNoteToRanges(ranges, noteId, text) {
        const successfully = this._appendNoteToRangeNodes(ranges, noteId, text);

        ranges.forEach(r => this._collapseRange(r));
     
        return successfully;
    }

    static _appendNoteToRangeNodes(ranges, noteId, text) {
        if (!ranges)
            return false;

        const firstRange = ranges[0];
        const lastRange = ranges[ranges.length - 1];
        const hasOnlyRange = firstRange === lastRange;

        const endOffset = lastRange.endOffset;
        const skipLastNode = !endOffset;

        let selectedNodes = this._getSelectedTextNodes(firstRange);

        if (!hasOnlyRange)
            selectedNodes = selectedNodes.concat(this._getSelectedTextNodes(lastRange));

        let lastNodeIndex = selectedNodes.length - (skipLastNode ? 1 : 0) - 1;
        lastNodeIndex = lastNodeIndex <= 0 ? 0: lastNodeIndex;
        const isSingleNode = hasOnlyRange && !lastNodeIndex;

        if (isSingleNode) {
            const noteNode = this._createSolidContainerNoteNode(noteId, text);
            noteNode.append(firstRange.extractContents());
            firstRange.insertNode(noteNode);

            return true;
        }
    
        const startOffset = firstRange.startOffset;

        const firstNode = selectedNodes[0];
        const useFirstNodePartially = startOffset > 0;

        const startNoteEl = this._createStartContainerNoteNode(noteId, text);

        if (useFirstNodePartially) {
            const val = firstNode.nodeValue;
            firstNode.nodeValue = val.substring(0, startOffset);

            const fragment = new DocumentFragment();
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

            const fragment = new DocumentFragment();
            fragment.append(document.createTextNode(val.substring(0, endOffset)), endNoteEl);
            
            lastNode.parentElement.insertBefore(fragment, lastNode);
        }
        else
            lastNode.parentElement.insertBefore(endNoteEl, lastNode.nextSibling);

        return true;
    }

    static _appendNoteToNode(targetNode, noteId, text) {
        const noteEl = this._createSolidContainerNoteNode(noteId, text);
        targetNode.replaceWith(noteEl);

        noteEl.append(targetNode);

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
        return this._getNoteElement(targetNode) !== null;
    }

    static _getNoteElement(targetNode) {
        if (this._elementHasNote(targetNode))
            return targetNode;

        const parentElement = targetNode.parentElement;
        return this._elementHasNote(parentElement) ? parentElement : null;
    }

    static _elementHasNote(targetNode) {
        return targetNode && targetNode.classList.contains(this.HAS_NOTE_CLASS_NAME);
    }

    static removeNote(targetNode) {
        if (!(targetNode = this._getNoteElement(targetNode)))
            return false;

        const noteId = targetNode.dataset.noteId;

        if (!noteId)
            return false;

        const noteNodes = [...document.querySelectorAll(`.marker-has-note[data-note-id="${noteId}"]`)];
        noteNodes.forEach(n => n.childElementCount === 1 ? n.remove() : this._extractLastChildContent(n));

        return noteNodes.length > 0;        
    }

    static _extractLastChildContent(targetNode) {
        targetNode.replaceWith(targetNode.lastChild);
    }
}
