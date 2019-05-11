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
        this._getSelectionOrFocusedNodes(targetNode).forEach(node => {
            node.replaceWith(document.createTextNode(node.textContent));
            node.remove();
        });
    }

    _getSelectionOrFocusedNodes(targetNode) {
        const range = this._getSelectionRange();

        if (range) {
            const nodes = this._getMarkerElementsFromSelection(range);
            range.collapse();
            
            return nodes;
        }
        else if (targetNode)
            return this._getMarkerElementsFromElement(targetNode);

        return [];
    }
    
    _getMarkerElementsFromElement(node) {
        const markerClass = RangeMarker.markerClass;
        return node.classList.contains(markerClass) ? [node] : 
            [...node.getElementsByClassName(markerClass)];
    }

    changeSelectedNodesColour(colourClass, targetNode = null) {
        this._tryChangeAllMarkerNodes(this._getSelectionOrFocusedNodes(targetNode), 
            colourClass);
    }

    _tryChangeAllMarkerNodes(markedElems, colourClass) {
        if (!markedElems || !markedElems.length)
            return false;

        markedElems.forEach(el => el.classList.replace(
            this._obtainMarkerColourClass(el.classList), colourClass));
        return true;
    }

    markSelectedNodes(colourClass) {
        const range = this._getSelectionRange();

        if (!range)
            return;

        const selectedNodes = this._getSelectedTextNodes(range);

        if (!selectedNodes.length)
            return range.collapse();

        this._markTextNodes(selectedNodes, range, colourClass);
        return range.collapse();
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
        
        let lastError;

        nodes.forEach((node, index) => {
            try {
                const startOffset = range.startOffset;
                const markFirstNodePartially = !index && startOffset;
                
                const endOffset = range.endOffset;
                const isLastNode = index === lastNodeIndex;
                const skipLastNode = isLastNode && !endOffset;
                const markLastNodePartially = isLastNode && (endOffset && endOffset !== node.length);

                let markerNode = node.parentElement;

                if (markerNode.classList.contains(markerClass)) {
                    let curColour;
                    
                    if ((curColour = this._obtainMarkerColourClass(markerNode.classList)) === colour)
                        return;

                    const nodeValue = node.nodeValue;

                    let _startOffsetForEnd = 0;

                    if (markFirstNodePartially) {
                        const newNode = this._createMarkedSpan(colour);
                        newNode.innerHTML = nodeValue.substring(startOffset);
            
                        node.nodeValue = nodeValue.substring(0, startOffset);
                        markerNode.parentNode.insertBefore(newNode, markerNode.nextSibling);

                        markerNode = newNode;
                        node = newNode.firstChild;

                        _startOffsetForEnd = startOffset;
                    }
                    
                    if (markLastNodePartially) {
                        const newNode = this._createMarkedSpan(colour);
                        newNode.innerHTML = nodeValue.substring(_startOffsetForEnd, endOffset);

                        node.nodeValue = nodeValue.substring(endOffset);
                        
                        markerNode.classList.replace(colour, curColour);
                        markerNode.parentNode.insertBefore(newNode, markerNode);
                    }
                    else if (skipLastNode)
                        return;
                    else
                        markerNode.classList.replace(curColour, colour);
                }
                else {
                    if (isSingleNode)
                        return range.surroundContents(this._createMarkedSpan(colour));

                    if (markFirstNodePartially) {
                        const val = node.nodeValue;
                        const newNode = this._createMarkedSpan(colour);
                        newNode.innerHTML = val.substring(startOffset);
            
                        node.nodeValue = val.substring(0, startOffset);
                        node.parentNode.insertBefore(newNode, node.nextSibling);
                    }
                    else if (markLastNodePartially) {
                        const val = node.nodeValue;
                        const newNode = this._createMarkedSpan(colour);
                        newNode.innerHTML = val.substring(0, endOffset);
            
                        node.nodeValue = val.substring(endOffset);
                        node.parentNode.insertBefore(newNode, node);
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

    _createMarkedSpan(colourClass) {
        const node = document.createElement('span');
        node.classList.add(RangeMarker.markerClass, colourClass);
        return node;
    };

    static get markerClass() { return 'marker'; }
};
