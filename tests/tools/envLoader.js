import jsDom from 'jsdom-global';
import fs from 'fs';
import _path from 'path';

export class EnvLoader {
    static loadClass(scriptPath, ...classNames) {
        return this._wrapWithPromise(resolve => {
            this._checkPathExistence(scriptPath);
            
            fs.readFile(scriptPath, (err, data) => {
                if (err)
                    throw err;

                const globalInitialiser = classNames.map(cl => `global.${cl}=${cl};`).join('');
                const commonJsFileData = data.toString('utf8').replace('export class', 'class').replace('import ', '//import ');
                eval(commonJsFileData + globalInitialiser);

                resolve();
            });
        });
    }

    static _wrapWithPromise(callback) {
        return new Promise((resolve, reject) => {
            try {
                callback(resolve);
            } catch (ex) {
                reject(ex);
            }
        });
    }

    static _checkPathExistence(path) {
        if (!fs.existsSync(path))
            throw new Error(`A file ${_path.resolve(path)} does not exist`);
    }

    static loadDomModel(path = './tests/resources/testPage.html') {
        return this._wrapWithPromise(resolve => {
            if (this._cleanup)
                return;

            this._checkPathExistence(path);

            fs.readFile(path, (err, data) => {
            
                if (err)
                    throw err;
            
                this._cleanup = jsDom(data.toString('utf8'));
                this._buildDocumentCreateRangeFunction();
                this._buildDocumentContentChecker();

                resolve();
            });
        });
    }

    static _buildDocumentCreateRangeFunction() {
        if (global.document && !this._ranges) {
            this._ranges = [new Range()];
            
            global.document.createRange = () => this._ranges[0];
            
            global.document.appendRange = () => { 
                const collapsedRange = this._ranges.find(r => r.collapsed);

                if (collapsedRange)
                    return collapsedRange;
                    
                const newRange = new Range();
                this._ranges.push(newRange);

                return newRange;
            };

            this._setWindowSelection();
        }
    }

    static _setWindowSelection() {
        if (!global.window)
            global.window = {};

        global.window.getSelection = () => {
            const activeRanges = EnvLoader._ranges.filter(r => !r.collapsed);

            return { 
                isCollapsed: !activeRanges.length,
                getRangeAt(index) { return activeRanges[index]; },
                rangeCount: activeRanges.length
            };
        };
    }

    static _buildDocumentContentChecker() {
        if (!global.document)
            return;

        const originalDocTextContent = this._getAllDocTextContent();

        global.document.textContentChanged = (nodesToRemoveSelector = '') => {
            if (nodesToRemoveSelector)
                document.body.querySelectorAll(nodesToRemoveSelector).forEach(n => n.remove());

            return this._getAllDocTextContent() !== originalDocTextContent;
        };
    }

    static _getAllDocTextContent() {
        return document.body.textContent.replace(/\s/gm, '');
    }

    static unloadDomModel() {
        if (this._cleanup) {
            this._cleanup();
            this._cleanup = null;
        }

        if (this._ranges) {
            this._ranges = null;
            global.window = null;
        }
    }
}

class Range {
    constructor() {
        this.commonAncestorContainer;

        this.startContainer;
        this._startContainerParent;

        this.endContainer;
        this.endOffset = 0;
        this.startOffset = 0;
    }

    surroundContents(newParent) {
        if (this.collapsed || this.endContainer !== this.startContainer)
            return;

        const commonAncestor = this.startContainer.parentNode;
        const removedNode = commonAncestor.removeChild(this.startContainer);

        if (this.startOffset)
            commonAncestor.appendChild(document.createTextNode(
                removedNode.textContent.substr(0, this.startOffset)));
   
        const newNode = newParent.appendChild(document.createTextNode(
            removedNode.textContent.substr(this.startOffset, this.endOffset - this.startOffset)));
        commonAncestor.appendChild(newParent);

        if (this.endOffset !== removedNode.textContent.length)
            commonAncestor.appendChild(document.createTextNode(
                removedNode.textContent.substr(this.endOffset)));

        this.setStart(newNode);
        this.setEnd(newNode);
    }

    get collapsed() {
        return !this.startContainer || !this.endContainer;
    }

    collapse() {
        this.commonAncestorContainer = null;

        this.startContainer = null;
        this.startOffset = 0;

        this.endContainer = null;
        this.endOffset = 0;
    }

    setStart(node, offset = 0) {
        if (!node)
            return this.collapse();

        this.startOffset = offset;
        this.startContainer = this.startOffset === 0 ? node:
            this._getOffsetChild(node, this.startOffset);

        this._setCommonAncestor();

        this._startContainerParent = this.startContainer.parentNode;
    }
      
    _getOffsetChild(node, startFrom) {
        const childNodes = [...node.childNodes];

        if (childNodes.length === 1)
            return childNodes[0];

        let lengthSum = 0;

        for (let i = 0; i < childNodes.length; ++i) {
            const curNode = childNodes[i];

            if (startFrom < (lengthSum += curNode.textContent.length))
                return curNode;
        }
        
        return node;
    }

    setEnd(node, offset) {
        if (!node)
            return this.collapse();

        const nodeLength = node.textContent.length;
        this.endOffset = offset || nodeLength;

        this.endContainer = this.endOffset === nodeLength ? node:
            this._getOffsetChild(node, nodeLength - this.endOffset - 3);
        
        this._setCommonAncestor();
    }
    
    _setCommonAncestor() {
        if (this.collapsed)
            return this.commonAncestorContainer = null, undefined;
            
        if (this.endContainer === this.startContainer)
            return this.commonAncestorContainer = this.endContainer, undefined;
        
        const startParents = this._getAncestorsUntilRoot(this.startContainer);

        let node = this.endContainer;
        while (!startParents.includes(node) && (node = node.parentNode));

        this.commonAncestorContainer = node;
    }

    _getAncestorsUntilRoot(node) {
        const ancestors = [node];
        
        while ((node = node.parentNode) && node !== document.body)
            ancestors.push(node);

        return ancestors;
    }

    extractContents() {
        const docFragment = document.createDocumentFragment();

        if (this.collapsed)
            return docFragment;

        let curContainer = this.startContainer;
        const textNodes = this._splitTextNode(curContainer, this.startOffset);

        let startFragmentNode;
        if (textNodes.length > 1) {
            curContainer.replaceWith(textNodes[0]);
            startFragmentNode = textNodes[1];
        } else {
            curContainer.remove();
            startFragmentNode = curContainer;
        }

        docFragment.append(startFragmentNode);

        while (curContainer !== this.endContainer) {
            curContainer = curContainer.nextSibling;
            
            let fragmentEndNode;
            let endTextNodes;
            if (curContainer === this.endContainer && 
                (endTextNodes = this._splitTextNode(curContainer, this.endOffset).length > 1)) {
                curContainer.replaceWith(endTextNodes[1]);
                fragmentEndNode = endTextNodes[0];
            } else {
                curContainer.remove();
                fragmentEndNode = curContainer;
            }

            docFragment.append(fragmentEndNode);
        }

        return docFragment;
    }

    _splitTextNode(node, splitPosition) {
        let text;

        if (node.nodeType != Node.TEXT_NODE || !splitPosition || 
            !(text = node.textContent) || splitPosition === text.length)
            return [node];

        const firstPart = text.substring(0, splitPosition);
        const secondPart = text.substring(splitPosition);
        return [document.createTextNode(firstPart), document.createTextNode(secondPart)];
    }

    insertNode(newNode) {
        if (!this._startContainerParent)
            return;

        const firstChild = this._startContainerParent.firstChild;
        if (this.startOffset)
            firstChild.after(newNode);
        else
            this._startContainerParent.insertBefore(newNode, firstChild);
    }
}
