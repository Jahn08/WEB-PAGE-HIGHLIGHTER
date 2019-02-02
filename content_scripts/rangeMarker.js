class RangeMarker
{
    constructor (colourClassName)
    {
        this._colourClassName = colourClassName;
    }
    
    applyClassToSelectedNodes() {
        const range = this._getSelectionRange();

        if (!range)
            return;

        const selectedNodes = this._getRangeSelectedNodes(range).filter(this._isProperTextNode);

        if (!selectedNodes.length)
            return range.collapse();

        if (selectedNodes.length === 1)
        {
            range.surroundContents(this._createMarkedSpan());
            return range.collapse();
        }

        if (range.startOffset)
        {
            const firstNode = selectedNodes.shift();

            const val = firstNode.nodeValue;
            const newNode = this._createMarkedSpan();
            newNode.innerHTML = val.substring(range.startOffset);

            firstNode.nodeValue = val.substring(0, range.startOffset);
            firstNode.parentNode.insertBefore(newNode, firstNode.nextSibling);
        }

        const lastNode = selectedNodes[selectedNodes.length - 1];

        if (range.endOffset && range.endOffset !== lastNode.length)
        {
            selectedNodes.pop();

            const val = lastNode.nodeValue;
            const newNode = this._createMarkedSpan();
            newNode.innerHTML = val.substring(0, range.endOffset);

            lastNode.nodeValue = val.substring(range.endOffset);
            lastNode.parentNode.insertBefore(newNode, lastNode);
        }

        selectedNodes.forEach(n => n.parentNode.insertBefore(this._createMarkedSpan(), n).appendChild(n));
        range.collapse();
    }

    _getSelectionRange() {
        const sel = window.getSelection();
        return sel.isCollapsed ? null: sel.getRangeAt(0);
    }

    _getRangeSelectedNodes(range) {
        let curNode = this._getDeepestNode(range.startContainer);

        if (curNode !== range.startContainer)
            range.setStart(curNode, 0);

        // TODO: Reaching for the deepest text container too
        const endNode = range.endContainer;
    
        if (curNode === endNode)
            return [curNode];
    
        const rangeNodes = [curNode];
        while (curNode && curNode !== endNode)
            rangeNodes.push(curNode = this._nextNode(curNode));
    
        return rangeNodes;
    }

    _getDeepestNode(container) {
        if (this._isProperTextNode(container))
            return container;

        return this._lookIntoNode(container);
    }

    _isProperTextNode(node) {        
        const textNodeType = 3;
        return node.nodeType === textNodeType && node.nodeValue && node.nodeValue.trim().length > 0;
    }

    _lookIntoNode(node) {
        const nodeFoundMsg = 'success';

        let outcome;

        if (this._isProperTextNode(node))
            return node;
        else if (node.childNodes && node.childNodes.length)    
        {
            try 
            {
                node.childNodes.forEach(c => {
                    if (outcome = this._lookIntoNode(c))
                        throw new Error(nodeFoundMsg);
                });
            }
            catch (ex)
            {
                if (ex.message !== nodeFoundMsg)
                    throw ex;
            }
        }

        return outcome;
    }

    _nextNode(node) {
        if (node.hasChildNodes())
            return node.firstChild;
        else 
        {
            while (node && !node.nextSibling)
                node = node.parentNode;

            return node ? node.nextSibling: null;
        }
    }

    _createMarkedSpan() {
        const node = document.createElement('span');
        node.classList.add('marker', this._colourClassName);
        return node;
    };
};
