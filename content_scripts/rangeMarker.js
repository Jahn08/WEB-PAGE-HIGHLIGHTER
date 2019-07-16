class RangeMarker extends RangeBase {    
    static isNodeMarked(node) {
        return node && node.classList.contains(RangeMarker.markerClass);
    }

    static getColourClassesForSelectedNodes() {
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

    static _obtainMarkerColourClass(classList) { return classList.item(1); }

    static _getMarkerElementsFromSelection(range) {
        return this._getMarkerElementsFromTextNodes(this._getSelectedTextNodes(range));
    }

    static _getMarkerElementsFromTextNodes(nodes = []) {
        const markerClass = RangeMarker.markerClass;
        return nodes.map(n => n.parentElement).filter(n => n.classList.contains(markerClass));
    }

    static unmarkSelectedNodes(targetNode = null) {
        const range = this._getSelectionRange();
        const affectedNodes = this._markTextNodes(this._getActiveTextNodes(range, targetNode), range);
   
        this._collapseRange(range);

        this._removeEmptyMarkers();

        return affectedNodes.length > 0;
    }
    
    static _getActiveTextNodes(range, targetNode) {
        if (range)
            return this._getSelectedTextNodes(range);
        else if (targetNode)
            return this._getMarkerElementsFromElement(targetNode)
                .map(n => n.firstChild)
                .filter(n => this._isProperTextNode(n));
    
        return [];
    }

    static _getMarkerElementsFromElement(node) {
        const markerClass = RangeMarker.markerClass;
        return node.classList.contains(markerClass) ? [node] : 
            [...node.getElementsByClassName(markerClass)];
    }

    static _removeEmptyMarkers() {
        for (const node of document.getElementsByClassName(RangeMarker.markerClass))
            if (!node.childNodes.length)
                node.remove();
    }

    static markSelectedNodes(colourClass) {
        const range = this._getSelectionRange();
        const selectedNodes = this._getSelectedTextNodes(range);

        if (!selectedNodes.length)
            return this._collapseRange(range), false;

        this._markTextNodes(selectedNodes, range, colourClass);
        this._collapseRange(range);

        return true;
    }

    static _markTextNodes(nodes, range, colour = null) {
        const markerClass = RangeMarker.markerClass;
        const lastNodeIndex = nodes.length - 1;

        const isSingleNode = !lastNodeIndex;
        
        const rangeIsAvailable = range;
        const startOffset = rangeIsAvailable && range.startOffset;
        const endOffset = rangeIsAvailable && range.endOffset;

        let lastError;

        const affectedNodes = nodes.filter((node, index) => {
            try {
                const markFirstNodePartially = !index && startOffset;
                
                const isLastNode = index === lastNodeIndex;
                const skipLastNode = rangeIsAvailable && isLastNode && !endOffset;

                if (skipLastNode)
                    return false;
                
                const markLastNodePartially = isLastNode && endOffset && endOffset !== node.length;

                let markerNode = node.parentElement;

                if (markerNode.classList.contains(markerClass)) {
                    let curColour;
                    
                    if ((curColour = this._obtainMarkerColourClass(markerNode.classList)) === colour)
                        return false;

                    const nodeValue = node.nodeValue;

                    let _startOffsetForEnd = 0;

                    if (markFirstNodePartially) {
                        node.nodeValue = nodeValue.substring(0, startOffset);

                        const newNode = this._createMarkerNode(colour, nodeValue, startOffset);
                        this._insertNodeAfter(newNode, markerNode);

                        markerNode = newNode;
                        node = newNode.firstChild || newNode;

                        _startOffsetForEnd = startOffset;
                    }
                    
                    if (markLastNodePartially) {
                        node.nodeValue = nodeValue.substring(endOffset);
                        
                        const newNode = this._createMarkerNode(colour, nodeValue, _startOffsetForEnd, 
                            endOffset);
                        this._insertNodeBefore(newNode, markerNode);

                        if (markerNode.classList)
                            markerNode.classList.replace(colour, curColour);
                        else
                            markerNode.replaceWith(
                                this._createMarkerNode(curColour, markerNode.nodeValue));
                    }
                    else if (colour)
                        markerNode.classList.replace(curColour, colour);
                    else {
                        markerNode.replaceWith(document.createTextNode(markerNode.textContent));
                        markerNode.remove();
                    }
                }
                else {
                    if (!colour)
                        return false;

                    if (rangeIsAvailable && isSingleNode)
                        return range.surroundContents(this._createMarkedSpan(colour)), true;

                    if (markFirstNodePartially) {
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
                    else
                        markerNode.insertBefore(this._createMarkedSpan(colour), node).appendChild(node);
                }

                return true;
            }
            catch (e) {
                lastError = e;
            }
        });

        if (lastError)
            throw lastError;

        return affectedNodes;
    }

    static _createMarkerNode(colour, innerHtml, substrStart = 0, substrEnd = innerHtml.length) {
        const contents = innerHtml.substring(substrStart, substrEnd);

        let newNode;
        
        if (colour) {
            newNode = this._createMarkedSpan(colour);
            newNode.innerHTML = contents;
        }
        else
            newNode = document.createTextNode(contents);

        return newNode;
    }

    static _insertNodeAfter(newNode, referenceNode) { 
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling); 
    }

    static _insertNodeBefore(newNode, referenceNode) { 
        referenceNode.parentNode.insertBefore(newNode, referenceNode);
    }

    static _createMarkedSpan(colourClass) {
        const node = document.createElement('span');
        node.classList.add(RangeMarker.markerClass, colourClass);
        return node;
    }

    static changeSelectedNodesColour(colourClass, targetNode = null) {
        const range = this._getSelectionRange();
        const affectedNodes = this._markTextNodes(this._getActiveTextNodes(range, targetNode), 
            range, colourClass);

        this._collapseRange(range);

        return affectedNodes.length > 0;
    }

    static domContainsMarkers() {
        return document.getElementsByClassName(RangeMarker.markerClass).length > 0;
    }

    static get markerClass() { return 'marker'; }
}

window.RangeMarker = RangeMarker;
