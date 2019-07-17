import assert from 'assert';
import { Randomiser } from '../tools/randomiser.js';
import { EnvLoader } from '../tools/envLoader.js';
import { BrowserMocked } from '../tools/browserMocked.js';
import { Expectation } from '../tools/expectation.js';
import { StorageHelper } from '../tools/storageHelper.js';

describe('content_script/browserStorage', function () {
    this.timeout(0);

    const browser = new BrowserMocked();

    let storage;

    beforeEach('loadResources', done => {
        storage = browser.resetBrowserStorage();
        
        EnvLoader.loadDomModel().then(() => done()).catch(done);
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

        it('should get an object previously set in the storage', () =>
            Expectation.expectResolution(StorageHelper.saveRandomObjects(1), 
                async storageValues => {
                    const expectedObj = storageValues[0];
                    const result = await new BrowserStorage(expectedObj.key).get();
                    assert(result);
                    assert.deepStrictEqual(result, expectedObj);

                    assert.strictEqual(storage.length, 1);
                }
            )
        );
    });

    describe('#contains', function () {

        const testContaining = (savedKey, loadedKey, shouldContain = false) => {
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
    
    const assureArrayIsInObject = (obj, expectedValues) => {
        expectedValues.forEach(v => assert.deepStrictEqual(obj[v.key], v));
        assert.strictEqual(Object.getOwnPropertyNames(obj).length, expectedValues.length);
    };

    describe('#getAll', function () {
        it('should get previously saved items from the storage', () =>
            Expectation.expectResolution(StorageHelper.saveRandomObjects(), 
                async expectedValues => {
                    const result = await BrowserStorage.getAll();
                    assureArrayIsInObject(result, expectedValues);
                })
        );
    });

    describe('#remove', function () {
        it('should remove previously saved items from the storage', () =>
            Expectation.expectResolution(StorageHelper.saveRandomObjects(5), async storageObjs => {
                const keysForRemoval = [storageObjs[0], storageObjs[storageObjs.length - 1]]
                    .map(obj => obj.key);
                await BrowserStorage.remove(keysForRemoval);
                
                const result = await BrowserStorage.getAll();
                assureArrayIsInObject(result, 
                    storageObjs.filter(obj => !keysForRemoval.includes(obj.key)));
            })
        );

        it('should remove nothing from the storage when passing an empty array', () =>
            Expectation.expectResolution(StorageHelper.saveRandomObjects(5), async storageObjs => {
                await BrowserStorage.remove([]);
                
                const result = await BrowserStorage.getAll();
                assureArrayIsInObject(result, storageObjs);
            })
        );
    });
});
