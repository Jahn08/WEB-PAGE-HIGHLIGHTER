import jsDom from 'jsdom-global';
import fs from 'fs';
import _path from 'path';

export class EnvLoader {
    static loadClass(scriptPath, className) {
        return this._wrapWithPromise(() => {
            this._checkPathExistence(scriptPath);
            
            fs.readFile(scriptPath, (err, data) => {
                if (err)
                    throw err;

                const globalInitialiser = `global.${className}=${className};`;
                eval(data.toString('utf8') + globalInitialiser);
            });
        });
    }

    static _wrapWithPromise(callback)
    {
        return new Promise((resolve, reject) => {
            try {
                resolve(callback());
            }
            catch (ex) {
                reject(ex);
            }
        });
    }

    static _checkPathExistence(path)
    {
        if (!fs.existsSync(path))
            throw new Error(`A file ${_path.resolve(path)} does not exist`);
    }

    static loadDomModel(path = './tests/resources/testPage.html') {
        
        return this._wrapWithPromise(() => {
            if (EnvLoader._cleanup)
                return;

            this._checkPathExistence(path);

            fs.readFile(path, (err, data) => {
                if (err)
                    throw err;
            
                EnvLoader._cleanup = jsDom(data.toString('utf8'))
            });
        });
    }

    static unloadDomModel() {
        if (EnvLoader._cleanup) {
            EnvLoader._cleanup();
            EnvLoader._cleanup = null;
        }
    }
}
