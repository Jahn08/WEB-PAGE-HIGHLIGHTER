import assert from 'assert';
import { Randomiser } from '../tools/randomiser.js';
import { EnvLoader } from '../tools/envLoader.js';
import { BrowserMocked } from '../tools/browserMocked.js';
import { Expectation } from '../tools/expectation.js';

describe('content_script/browserStorage', function () {
    this.timeout(0);

    const browser = new BrowserMocked();

    let storage;

    beforeEach('loadResources', done => {
        storage = browser.resetBrowserStorage();
        
        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/browserStorage.js', 'BrowserStorage')
            .then(() => done())
            .catch(done);
    });

    afterEach('releaseResources', () => {        
        EnvLoader.unloadDomModel();
    });

    describe('#get', function () {

        it('should return null while trying to get a non-existent object from the storage', () =>
            Expectation.expectResolution(new BrowserStorage(Randomiser.getRandomNumberUpToMax()).get(), 
                outcome => { 
                    assert(!outcome);
                    assert(storage.isEmpty());
                })
        );

        it('should get an object previously set in the storage', () => {
            const itemKey = Randomiser.getRandomNumberUpToMax();
            const expectedObj = { id: Randomiser.getRandomNumberUpToMax() };

            return Expectation.expectResolution(new BrowserStorage(itemKey).set(expectedObj), () =>
                Expectation.expectResolution(new BrowserStorage(itemKey).get(), 
                    result => {
                        assert(result);
                        assert.deepStrictEqual(result, expectedObj);

                        assert.strictEqual(storage.length, 1);
                    })
            );
        });
    });

    describe('#contains', function () {

        const testContaining = (savedKey, loadedKey, shouldContain = false) => {
            const itemKey = Randomiser.getRandomNumberUpToMax();
            const expectedObj = { id: Randomiser.getRandomNumberUpToMax() };

            return Expectation.expectResolution(new BrowserStorage(savedKey).set(expectedObj), () =>
                Expectation.expectResolution(new BrowserStorage(loadedKey).contains(), 
                    result => {
                        assert.strictEqual(result, shouldContain);
                        assert.strictEqual(storage.length, 1);
                    })
            );
        };

        it('should return false for a non-existent object in the storage', () =>
            testContaining(Randomiser.getRandomNumberUpToMax(), Randomiser.getRandomNumberUpToMax())
        );

        it('should return true for an object existent in the storage', () => {
            const itemKey = Randomiser.getRandomNumberUpToMax();
            return testContaining(itemKey, itemKey, true);
        });
    });
});
