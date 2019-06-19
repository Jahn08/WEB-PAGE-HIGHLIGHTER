import assert from 'assert';
import { Randomiser } from '../tools/randomiser.js';
import { EnvLoader } from '../tools/envLoader.js';
import { StorageMocked } from '../tools/storageMocked.js';
import { Expectation } from '../tools/expectation.js';

describe('content_script/pageInfo', function () {
    this.timeout(0);

    let storage;

    beforeEach('loadResources', done => {
        storage = new StorageMocked();
        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/browserStorage.js', 'BrowserStorage')
            .then(() => EnvLoader.loadClass('./content_scripts/pageInfo.js', 'PageInfo')
                .then(() => done())
            ).catch(done);
    });
    
    afterEach('releaseResources', () => {
        if (storage)
            storage.dispose();
        
        EnvLoader.unloadDomModel();
    });

    describe('#load', function () {

        const WRONG_HTML_ERROR = { name: 'WrongHtmlError' };

        it('should throw an error while loading a page absent from the storage', () =>
            Expectation.expectRejection(new PageInfo().load(), 
                WRONG_HTML_ERROR, () => assert(storage.isEmpty()))
        );

        it('should throw an error while loading a page of a wrong format', () => {
            const itemKey = document.location.href;
            const browserStorage = new BrowserStorage(itemKey);

            const expectedObj = { id: Randomiser.getRandomNumberUpToMax() };
            
            return Expectation.expectResolution(browserStorage.set(expectedObj), () =>
                Expectation.expectRejection(new PageInfo().load(), WRONG_HTML_ERROR, 
                    () => {
                        assert.strictEqual(storage.length, 1);

                        return browserStorage.get().then(res =>
                            assert.deepStrictEqual(res, expectedObj));
                    })
            );
        });

        it('should load a page previously saved in the storage', () => {
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
                    assert.strictEqual(storage.length, 1);

                    const loadedDiv = document.getElementById(parentDiv.id);
                    assert(loadedDiv);
                    assert.strictEqual(loadedDiv.childElementCount, 1);

                    assert.strictEqual(loadedDiv.firstElementChild.innerHTML, 
                        childLabel.innerHTML);
                });
        });
    });
});
