import assert from 'assert';

class Expectation {
    static expectError(fn, expectedProps) {
        assert(Expectation._isFunction(fn), 'The first argument should be a function');

        try {
            fn();
        } catch (err) {
            return Expectation._assertExpectedProps(err, expectedProps);
        }

        throw new Error('An error was expected');
    }

    static expectRejection(promise, expectedProps, assertionFn = null) {
        return new Promise((resolve, reject) => {
            promise.catch(resultErr => {
                try {
                    assert(resultErr);

                    Expectation._assertExpectedProps(resultErr, expectedProps);
                    
                    return Expectation._processCallback(assertionFn, resultErr, resolve, reject);
                } catch (err) {
                    reject(err);
                }
            }).then(() => reject(new Error('The callback should\'ve been rejected')));
        });
    }

    static _assertExpectedProps(actualObj, expectedProps) {
        if (!expectedProps)
            return;

        Object.getOwnPropertyNames(expectedProps).filter(prop => prop !== 'stack').forEach(prop =>
            assert.strictEqual(actualObj[prop], expectedProps[prop], 
                `Actual[${prop}] is '${actualObj[prop]}', Expected[${prop}]` +
                ` is '${expectedProps[prop]}'. Actual: '${JSON.stringify(actualObj)}'`)
        );
    }

    static _processCallback(callback, result, resolve, reject) {
        if (!Expectation._isFunction(callback))
            return resolve();

        const resp = callback(result);

        if (resp instanceof Promise)
            return resp.then(resolve).catch(reject);

        return resolve(result);
    }

    static _isFunction(fn) { return typeof fn === 'function'; }

    static expectResolution(promise, assertionFn = null) {
        return new Promise((resolve, reject) => {
            promise.then(result => {
                try {
                    return Expectation._processCallback(assertionFn, result, resolve, reject);
                } catch (err) {
                    reject(err);
                }
            }).catch(err => reject(err));
        });
    }
    
    static expectInNextLoopIteration(assertionFn) {
        return new Promise((resolve, reject) => {
            setImmediate(() => {
                Expectation._processCallback(assertionFn, undefined, resolve, reject);
            });
        });
    }
}

export { Expectation };
