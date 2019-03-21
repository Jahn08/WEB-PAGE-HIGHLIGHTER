class RangeMarker {    
    constructor() {
        this._focusEvent = 'focus';
    }

    isNodeMarked(node) {
        const markerClass = RangeMarker.markerClass;
        return node.classList.contains(markerClass) || node.getElementsByClassName(markerClass).length;
    }

    getColourClassesForSelectedNodes() {
        const range = this._getSelectionRange();

        if (!range)
            return;

        const selectedNodes = this._getSelectedTextNodes(range);

        if (!selectedNodes.length)
            return [];
        
        const markerClass = RangeMarker.markerClass;
        const markerContainerClass = RangeMarker.markerContainerClass;

        const colourClasses = selectedNodes.map(m => m.parentNode.className.split(' ')
                .filter(cl => cl !== markerClass && cl !== markerContainerClass && 
                    cl.startsWith(markerClass))[0])
            .filter(cl => cl);

        return [...new Set(colourClasses)];
    }

    unmarkSelectedNodes(targetNode = null) {
        const range = this._getSelectionRange();

        if (range)
        {
            this._removeAllMarkerNodes(range.commonAncestorContainer);
            return range.collapse();
        }

        this._removeAllMarkerNodes(targetNode);
    }

    _removeAllMarkerNodes(targetNode) {
        if (!targetNode)
            return;

        const parentNode = this._getMarkerContainer(targetNode);

        if (parentNode)
        {
            [...parentNode.getElementsByClassName(RangeMarker.markerClass)]
                .forEach(node => {
                    node.replaceWith(document.createTextNode(node.innerText));
                    node.remove();
                });
            parentNode.classList.remove(RangeMarker.markerContainerClass);
        }
    }

    _getMarkerContainer(node) {
        let curNode = node;
        
        while (curNode.classList && 
            !curNode.classList.contains(RangeMarker.markerContainerClass) && 
            (curNode = curNode.parentNode));
        
        return curNode.classList && 
            curNode.classList.contains(RangeMarker.markerContainerClass) ? curNode: null;
    }
    
    changeSelectedNodesColour(colourClass, targetNode = null) {
        const range = this._getSelectionRange();

        if (range)
        {
            this._changeAllMarkerNodes(range.commonAncestorContainer, colourClass);
            return range.collapse();
        }

        this._changeAllMarkerNodes(targetNode, colourClass);
    }

    _changeAllMarkerNodes(targetNode, colourClass) {
        if (!targetNode)
            return false;

        const parentNode = this._getMarkerContainer(targetNode);
        let markedNodes;

        if (!parentNode || 
            !(markedNodes = [...parentNode.getElementsByClassName(RangeMarker.markerClass)]).length)
            return false;

        markedNodes.forEach(node => node.classList.replace(node.classList.item(1), colourClass));
        return true;
    }

    markSelectedNodes(colourClass) {
        const range = this._getSelectionRange();

        if (!range)
            return;

        if (this._changeAllMarkerNodes(range.commonAncestorContainer, colourClass))
            return range.collapse();

        const selectedNodes = this._getSelectedTextNodes(range);

        if (!selectedNodes.length)
            return range.collapse();

        let commonParent = range.commonAncestorContainer;

        if (!commonParent.classList)
            commonParent = commonParent.parentNode;
        
        const markerContainerClass = RangeMarker.markerContainerClass;

        if (!commonParent.classList.contains(markerContainerClass))
            commonParent.classList.add(markerContainerClass);

        if (selectedNodes.length === 1)
        {
            range.surroundContents(this._createMarkedSpan(colourClass));
            return range.collapse();
        }

        if (range.startOffset)
        {
            const firstNode = selectedNodes.shift();

            const val = firstNode.nodeValue;
            const newNode = this._createMarkedSpan(colourClass);
            newNode.innerHTML = val.substring(range.startOffset);

            firstNode.nodeValue = val.substring(0, range.startOffset);
            firstNode.parentNode.insertBefore(newNode, firstNode.nextSibling);
        }

        const lastNode = selectedNodes[selectedNodes.length - 1];

        if (range.endOffset && range.endOffset !== lastNode.length)
        {
            selectedNodes.pop();

            const val = lastNode.nodeValue;
            const newNode = this._createMarkedSpan(colourClass);
            newNode.innerHTML = val.substring(0, range.endOffset);

            lastNode.nodeValue = val.substring(range.endOffset);
            lastNode.parentNode.insertBefore(newNode, lastNode);
        }
        else if (!range.endOffset)
            selectedNodes.pop();

        selectedNodes.forEach(n => n.parentNode.insertBefore(this._createMarkedSpan(colourClass), n).appendChild(n));
        range.collapse();
    }

    _getSelectionRange() {
        const sel = window.getSelection();
        return sel.isCollapsed ? null: sel.getRangeAt(0);
    }

    _getSelectedTextNodes(range) {
        if (!range)
            return [];

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
    
        return rangeNodes.filter(this._isProperTextNode);
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

    _createMarkedSpan(colourClass) {
        const node = document.createElement('span');
        node.classList.add(RangeMarker.markerClass, colourClass);
        return node;
    };

    static get markerClass() { return 'marker'; }

    static get markerContainerClass() { return 'marker-container'; }
};
