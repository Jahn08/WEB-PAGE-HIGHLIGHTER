// eslint-disable-next-line no-unused-vars
class RangeBase {
    static _getSelectionRanges() {
        const sel = window.getSelection();
        
        if (!sel.isCollapsed) {
            const length = sel.rangeCount;
            const ranges = new Array(length);

            for (let i = 0; i < length; ++i)
                ranges[i] = sel.getRangeAt(i);

            return ranges;
        }

        return [];
    }

    static _collapseRange(range) { 
        if (range) 
            range.collapse(); 
    }

    static _getSelectedTextNodes(range) {
        if (!range)
            return [];

        let curNode = this._getDeepestNode(range.startContainer) || 
            range.startContainer;
        if (curNode !== range.startContainer)
            range.setStart(curNode, this._chooseOffsetForContainer(range.startContainer, 
                range.startOffset));

        const endNode = this._getDeepestNode(range.endContainer, true) || 
            range.endContainer;
        if (endNode !== range.endContainer)
            range.setEnd(endNode, this._chooseOffsetForContainer(range.endContainer, 
                range.endOffset, endNode.textContent.length));

        if (curNode === endNode)
            return [curNode];
    
        const rangeNodes = [curNode];
        while (curNode && curNode !== endNode)
            rangeNodes.push(curNode = this._nextNode(curNode));
    
        return rangeNodes.filter(n => this._isProperTextNode(n));
    }

    static _getDeepestNode(container, traverseFromEnd = false) {
        if (this._isProperTextNode(container))
            return container;

        return this._lookIntoNode(container, traverseFromEnd);
    }

    static _lookIntoNode(node, traverseFromEnd) {
        const nodeFoundMsg = 'success';

        let outcome;

        let childrenCount;

        if (this._isProperTextNode(node))
            return node;
        else if (node.childNodes && (childrenCount = node.childNodes.length))    
        {
            try 
            {
                const processNode = n => {
                    outcome = this._lookIntoNode(n, traverseFromEnd);

                    if (outcome)
                        throw new Error(nodeFoundMsg);
                };

                if (traverseFromEnd)
                    for (let i = childrenCount - 1; i >= 0; --i)
                        processNode(node.childNodes[i]);                                      
                else
                    node.childNodes.forEach(processNode);
            }
            catch (ex)
            {
                if (ex.message !== nodeFoundMsg)
                    throw ex;
            }
        }

        return outcome;
    }

    static _isProperTextNode(node) {     
        return this._isTextNode(node) && node.nodeValue && 
            node.nodeValue.trim().length > 0;
    }

    static _isTextNode(node) { return node.nodeType === Node.TEXT_NODE; }

    static _chooseOffsetForContainer(curContainer, offset, defaultOffset = 0) {
        return this._isTextNode(curContainer) ? offset : defaultOffset;
    }

    static _nextNode(node) {
        if (node.hasChildNodes())
            return node.firstChild;
        else 
        {
            while (node && !node.nextSibling)
                node = node.parentNode;

            return node ? node.nextSibling: null;
        }
    }
}