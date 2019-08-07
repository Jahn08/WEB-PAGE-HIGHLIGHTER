class FileReader {
    constructor() {
        this.onload = null;

        FileReader._readBlob = null;
    }

    static setResultPackage(resultPackage) {
        this._packageJson = typeof resultPackage === 'object' ? JSON.stringify(resultPackage): 
            resultPackage;
    }

    readAsText(blob) {
        FileReader._readBlob = blob;

        this._runCallback();
    }

    _runCallback() {
        if (!this.onload)
            return;
        
        const result = FileReader._packageJson;
        FileReader._packageJson = null;

        this.onload({ 
            target: { result }
        });
    }

    static get passedBlob() {
        return this._readBlob;
    }
}

export class FileTransfer {
    static configureGlobals() {
        global.FileReader = FileReader;
    }

    static get fileReaderClass() {
        return FileReader;
    }

    static addFileToInput(fileInput, contentObj = {}) {
        Object.defineProperty(fileInput, 'files', {
            writable: true,
            enumerable: true
        });

        fileInput.files = [new Blob([JSON.stringify(contentObj)])];

        return fileInput;
    }
}
