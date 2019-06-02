import assert from 'assert';
import { Randomiser } from '../tools/randomiser.js';
import { EnvLoader } from '../tools/envLoader.js';
import { StorageMocked } from '../tools/storageMocked.js';
import { Expectation } from '../tools/expectation.js';

describe('content_script/pageInfo', function () {
    this.timeout(0);

    beforeEach('loadDomModel', done => {
        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/browserStorage.js', 'BrowserStorage')
            .then(() => EnvLoader.loadClass('./content_scripts/pageInfo.js', 'PageInfo')
                .then(() => done())
            ).catch(done);
    });
    
    afterEach('unloadDomModel', () => EnvLoader.unloadDomModel());

    describe('#load', function () {

        it('should throw an error while loading a page absent from the storage', () => {
            const storage = new StorageMocked();
            
            return Expectation.expectRejection(new PageInfo().load(), 
                { name: 'NotFoundError' }, () => assert(storage.isEmpty()));
        });

        it('should throw an error while loading a page of a wrong format', () => {
            const storage = new StorageMocked();

            const itemKey = document.location.href;
            const browserStorage = new BrowserStorage(itemKey);

            const expectedObj = { id: Randomiser.getRandomNumberUpToMax() };
            browserStorage.set(expectedObj);

            return Expectation.expectRejection(new PageInfo().load(), 
                { name: 'WrongHtmlError' }, () => {
                    assert(!storage.isEmpty());

                    return browserStorage.get().then(res =>
                        assert.deepStrictEqual(res, expectedObj));
                });
        });

        it('should load a page previously saved in the storage', () => {
            const storage = new StorageMocked();
            
            const parentDiv = document.createElement('div');
            parentDiv.id = Randomiser.getRandomNumberUpToMax();

            const childLabel = parentDiv.appendChild(document.createElement('label'));
            childLabel.innerHTML = Randomiser.getRandomNumberUpToMax();

            document.body.appendChild(parentDiv);

            const pageInfo = new PageInfo();
            pageInfo.save();

            parentDiv.remove();

            assert.strictEqual(document.getElementById(parentDiv.id), null);

            return Expectation.expectResolution(new PageInfo().load(),
                () => {
                    assert(!storage.isEmpty());

                    const loadedDiv = document.getElementById(parentDiv.id);
                    assert(loadedDiv);
                    assert.strictEqual(loadedDiv.childElementCount, 1);

                    assert.strictEqual(loadedDiv.firstElementChild.innerHTML, 
                        childLabel.innerHTML);
                });
        });
    });
});
