import jsDom from 'jsdom-global';
import fs from 'fs';
import _path from 'path';

export class EnvLoader {
    static loadClass(scriptPath, className) {
        return this._wrapWithPromise(resolve => {
            this._checkPathExistence(scriptPath);
            
            fs.readFile(scriptPath, (err, data) => {
                if (err)
                    throw err;

                const globalInitialiser = `global.${className}=${className};`;
                eval(data.toString('utf8') + globalInitialiser);

                resolve();
            });
        });
    }

    static _wrapWithPromise(callback) {
        return new Promise((resolve, reject) => {
            try {
                callback(resolve);
            }
            catch (ex) {
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
            if (EnvLoader._cleanup)
                return;

            this._checkPathExistence(path);

            fs.readFile(path, (err, data) => {
            
                if (err)
                    throw err;
            
                EnvLoader._cleanup = jsDom(data.toString('utf8'))
                this._buildDocumentCreateRangeFunction();
                this._buildDocumentContentChecker();

                resolve();
            });
        });
    }

    static _buildDocumentCreateRangeFunction() {
        if (global.document && !EnvLoader._range) {
            EnvLoader._range = new Range();
            global.document.createRange = () => EnvLoader._range;
        }
    }

    static _buildDocumentContentChecker() {
        if (global.document) {
            const originalDocTextContent = this._getAllDocTextContent();

            global.document.textContentChanged = () =>
                this._getAllDocTextContent() !== originalDocTextContent;
        }
    }

    static _getAllDocTextContent()
    {
        return document.body.textContent.replace(/\s/gm, '');
    }

    static unloadDomModel() {
        if (EnvLoader._cleanup) {
            EnvLoader._cleanup();
            EnvLoader._cleanup = null;   
        }

        if (EnvLoader._range) {
            EnvLoader._range.dispose();
            EnvLoader._range = null;
        }
    }
}

class Range {
    constructor() {
        this.commonAncestorContainer;
        this.startContainer;
        this.endContainer;
        this.endOffset = 0;
        this.startOffset = 0;

        this._setWindowSelection();
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

    dispose() {
        if (global.window)
            global.window = null;
    }

    collapse() {
        this.commonAncestorContainer = null;

        this.startContainer = null;
        this.startOffset = 0;

        this.endContainer = null;
        this.endOffset = 0;
    };

    setStart(node, offset = 0) {
        if (!node)
            return this.collapse();

        this.startOffset = offset;
        this.startContainer = this.startOffset === 0 ? node:
            this._getOffsetChild(node, this.startOffset);
    
        this._setCommonAncestor();
    }
      
    _getOffsetChild(node, startFrom) {
        const childNodes = [...node.childNodes];

        if (childNodes.length === 1)
            return childNodes[0];

        let lengthSum = 0;

        for (let i = 0; i < childNodes.length; ++i)
        {
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
        if (!this.endContainer || !this.startContainer)
            return this.commonAncestorContainer = null, undefined;
            
        if (this.endContainer === this.startContainer)
            return this.commonAncestorContainer = this.endContainer, undefined;
        
        const startParents = this._getParentsUntilRoot(this.startContainer);

        let node = this.endContainer;
        while ((node = node.parentNode) && !startParents.includes(node));

        this.commonAncestorContainer = node;
    }

    _setWindowSelection() {
        if (!global.window)
            global.window = {};

        const _this = this;

        global.window.getSelection = () => {
            return { 
                isCollapsed: _this.collapsed,
                getRangeAt() { return _this; }
            };
        }
    }

    _getParentsUntilRoot(node) {
        const parents = [];
        
        while ((node = node.parentNode) && node !== document.body)
            parents.push(node);

        return parents;
    }
}
