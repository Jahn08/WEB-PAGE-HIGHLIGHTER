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
        this.startContainer = node;
        this.startOffset = offset;

        this._setCommonAncestor();
    }
      
    setEnd(node, offset) {
        this.endContainer = node;
        this.endOffset = offset || node.textContent.length;
        
        this._setCommonAncestor();
    }
    
    _setCommonAncestor() {
        if (this.endContainer && this.startContainer) {
            const startParents = this._getParentsUntilRoot(this.startContainer);

            let node = this.endContainer;
            while ((node = node.parentNode) && !startParents.includes(node));

            this.commonAncestorContainer = node;
        }
        else
            this.commonAncestorContainer = null;
    }

    _setWindowSelection() {
        if (!global.window)
            global.window = {};

        const _this = this;

        global.window.getSelection = () => {
            return { 
                getRangeAt() {
                    return _this;
                }
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
