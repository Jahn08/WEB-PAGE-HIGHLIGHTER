class RangeMarker {    
    isNodeMarked(node) {
        return node && node.classList.contains(RangeMarker.markerClass);
    }

    getColourClassesForSelectedNodes() {
        const range = this._getSelectionRange();

        if (!range)
            return;

        const markerElems = this._getMarkerElementsFromSelection(range);

        if (!markerElems.length)
            return [];

        const colourClasses = markerElems.map(e => this._obtainMarkerColourClass(e.classList))
            .filter(cl => cl);
        return [...new Set(colourClasses)];
    }

    _obtainMarkerColourClass(classList) { return classList.item(1); }

    _getMarkerElementsFromSelection(range) {
        return this._getMarkerElementsFromTextNodes(this._getSelectedTextNodes(range));
    }

    _getMarkerElementsFromTextNodes(nodes = []) {
        const markerClass = RangeMarker.markerClass;
        return nodes.map(n => n.parentElement).filter(n => n.classList.contains(markerClass));
    }

    unmarkSelectedNodes(targetNode = null) {
        const range = this._getSelectionRange();

        this._getSelectionOrFocusedNodes(range, targetNode).forEach(node => {
            node.replaceWith(document.createTextNode(node.textContent));
            node.remove();
        });

        this._collapseRange(range);
    }

    _getSelectionOrFocusedNodes(range, targetNode) {
        if (range)
            return this._getMarkerElementsFromSelection(range);
        else if (targetNode)
            return this._getMarkerElementsFromElement(targetNode);

        return [];
    }
    
    _collapseRange(range) { 
        if (range) 
            range.collapse(); 
    }

    _getMarkerElementsFromElement(node) {
        const markerClass = RangeMarker.markerClass;
        return node.classList.contains(markerClass) ? [node] : 
            [...node.getElementsByClassName(markerClass)];
    }

    markSelectedNodes(colourClass) {
        const range = this._getSelectionRange();

        if (!range)
            return;

        const selectedNodes = this._getSelectedTextNodes(range);

        if (!selectedNodes.length)
            return this._collapseRange(range);

        this._markTextNodes(selectedNodes, range, colourClass);
        return this._collapseRange(range);
    }

    _getSelectionRange() {
        const sel = window.getSelection();
        return sel.isCollapsed ? null: sel.getRangeAt(0);
    }

    _getSelectedTextNodes(range) {
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

    _getDeepestNode(container, traverseFromEnd = false) {
        if (this._isProperTextNode(container))
            return container;

        return this._lookIntoNode(container, traverseFromEnd);
    }

    _isProperTextNode(node) {     
        return this._isTextNode(node) && node.nodeValue && 
            node.nodeValue.trim().length > 0;
    }

    _isTextNode(node) { return node.nodeType === Node.TEXT_NODE; }

    _lookIntoNode(node, traverseFromEnd) {
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
                    if (outcome = this._lookIntoNode(n, traverseFromEnd))
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

    _chooseOffsetForContainer(curContainer, offset, defaultOffset = 0) {
        return this._isTextNode(curContainer) ? offset : defaultOffset;
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

    _markTextNodes(nodes, range, colour) {
        const markerClass = RangeMarker.markerClass;
        const lastNodeIndex = nodes.length - 1;

        const isSingleNode = !lastNodeIndex;
        
        const rangeIsAvailable = range;
        const startOffset = rangeIsAvailable && range.startOffset;
        const endOffset = rangeIsAvailable && range.endOffset;

        let lastError;

        nodes.forEach((node, index) => {
            try {
                const markFirstNodePartially = !index && startOffset;
                
                const isLastNode = index === lastNodeIndex;
                const skipLastNode = rangeIsAvailable && isLastNode && !endOffset;
                const markLastNodePartially = isLastNode && endOffset && endOffset !== node.length;

                let markerNode = node.parentElement;

                if (markerNode.classList.contains(markerClass)) {
                    let curColour;
                    
                    if ((curColour = this._obtainMarkerColourClass(markerNode.classList)) === colour)
                        return;

                    const nodeValue = node.nodeValue;

                    let _startOffsetForEnd = 0;

                    if (markFirstNodePartially) {
                        node.nodeValue = nodeValue.substring(0, startOffset);

                        const newNode = this._createMarkerNode(colour, nodeValue, startOffset);
                        this._insertNodeAfter(newNode, markerNode);

                        markerNode = newNode;
                        node = newNode.firstChild;

                        _startOffsetForEnd = startOffset;
                    }
                    
                    if (markLastNodePartially) {
                        node.nodeValue = nodeValue.substring(endOffset);
                        
                        const newNode = this._createMarkerNode(colour, nodeValue, _startOffsetForEnd, 
                            endOffset);
                        this._insertNodeBefore(newNode, markerNode);

                        markerNode.classList.replace(colour, curColour);
                    }
                    else if (skipLastNode)
                        return;
                    else
                        markerNode.classList.replace(curColour, colour);
                }
                else {
                    if (rangeIsAvailable && isSingleNode)
                        return range.surroundContents(this._createMarkedSpan(colour));

                    if (markFirstNodePartially) {
                        debugger
                        const val = node.nodeValue;
                        node.nodeValue = val.substring(0, startOffset);

                        const newNode = this._createMarkerNode(colour, val, startOffset);
                        this._insertNodeAfter(newNode, node);
                    }
                    else if (markLastNodePartially) {
                        const val = node.nodeValue;
                        node.nodeValue = val.substring(endOffset);

                        const newNode = this._createMarkerNode(colour, val, 0, endOffset);
                        this._insertNodeBefore(newNode, node);
                    }
                    else if (skipLastNode)
                        return;
                    else
                        markerNode.insertBefore(this._createMarkedSpan(colour), node).appendChild(node);
                }
            }
            catch (e) {
                debugger
                lastError = e;
            }
        });

        if (lastError)
            throw lastError;
    }

    _createMarkerNode(colour, innerHtml, substrStart, substrEnd) {
        const newNode = this._createMarkedSpan(colour);
        newNode.innerHTML = innerHtml.substring(substrStart, substrEnd);

        return newNode;
    }

    _insertNodeAfter(newNode, referenceNode) { 
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling); 
    }

    _insertNodeBefore(newNode, referenceNode) { 
        referenceNode.parentNode.insertBefore(newNode, referenceNode);
    }

    _createMarkedSpan(colourClass) {
        const node = document.createElement('span');
        node.classList.add(RangeMarker.markerClass, colourClass);
        return node;
    };

    changeSelectedNodesColour(colourClass, targetNode = null) {
        const range = this._getSelectionRange();
        const nodes = this._getSelectionOrFocusedNodes(range, targetNode);

        this._markTextNodes(nodes.map(n => n.firstChild).filter(n => this._isProperTextNode(n)), 
            range, colourClass);

        this._collapseRange(range);
    }

    static get markerClass() { return 'marker'; }
};
