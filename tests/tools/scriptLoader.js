import fs from 'fs';

export class ScriptLoader {
    static loadClass(scriptPath, className) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(scriptPath))
                return reject(`A file ${scriptPath} does not exist`);

            fs.readFile(scriptPath, (err, data) => {
                if (err)
                    return reject(err);

                const globalInitialiser = `global.${className}=${className};`;
                eval(data.toString('utf8') + globalInitialiser);

                resolve();
            });
        });
    }
}
