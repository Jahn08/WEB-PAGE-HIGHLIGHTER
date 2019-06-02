import assert from 'assert';

class Expectation {
    static expectRejection (asyncFn, errorObj, assertionFn = null) {
        return new Promise((resolve, reject) => {
            asyncFn.catch(resultErr => {
                try {
                    assert(resultErr);
    
                    if (errorObj) {
                        for (const prop in errorObj)
                            assert.strictEqual(resultErr[prop], errorObj[prop], 
                                `ActualError[${prop}] is '${resultErr[prop]}', ExpectedError[${prop}]` +
                                ` is '${errorObj[prop]}'. ActualError: '${resultErr.toString()}'`);
                    }
                    
                    return Expectation._processCallback(assertionFn, resultErr, resolve, reject);
                }
                catch (err) {
                    reject(err);
                }
            })
            .then(res => reject(new Error('The callback should\'ve been rejected')))
        });
    }

    static _processCallback(callback, result, resolve, reject) {
        if (!Expectation._isFunction(callback))
            return;

        const resp = callback(result);

        if (resp instanceof Promise)
            return resp.then(resolve).catch(reject);

        return resolve(result);
    }

    static _isFunction (fn) { return typeof fn === 'function'; }

    static expectResolution (asyncFn, assertionFn = null) {
        return new Promise((resolve, reject) => {
            asyncFn.then(result => {
                try {
                    return Expectation._processCallback(assertionFn, result, resolve, reject);
                }
                catch (err) {
                    reject(err);
                }
            })
            .catch(err => reject(err))
        });
    }
}

export { Expectation };
