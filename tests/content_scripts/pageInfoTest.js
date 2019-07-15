import assert from 'assert';
import { Randomiser } from '../tools/randomiser.js';
import { EnvLoader } from '../tools/envLoader.js';
import { BrowserMocked } from '../tools/browserMocked.js';
import { Expectation } from '../tools/expectation.js';
import { StorageHelper } from '../tools/storageHelper.js';

describe('content_script/pageInfo', function () {
    this.timeout(0);

    const browser = new BrowserMocked();

    let storage;

    beforeEach('loadResources', done => {
        storage = browser.resetBrowserStorage();

        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/pageInfo.js', 'PageInfo')
            .then(() => done())
            .catch(done);
    });
    
    afterEach('releaseResources', () => {        
        EnvLoader.unloadDomModel();
    });

    describe('#load', function () {

        const WRONG_HTML_ERROR = { name: 'WrongHtmlError' };

        it('should throw an error while loading a page absent from the storage', () =>
            Expectation.expectRejection(new global.PageInfo().load(), 
                WRONG_HTML_ERROR, () => assert(storage.isEmpty()))
        );

        it('should throw an error while loading a page of a wrong format', () => {
            const itemKey = document.location.href;
            const browserStorage = new global.BrowserStorage(itemKey);

            const expectedObj = { id: Randomiser.getRandomNumberUpToMax() };
            
            return Expectation.expectResolution(browserStorage.set(expectedObj), () =>
                Expectation.expectRejection(new global.PageInfo().load(), WRONG_HTML_ERROR, 
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

            const pageInfo = new global.PageInfo();
            pageInfo.save();

            parentDiv.remove();

            assert.strictEqual(document.getElementById(parentDiv.id), null);

            return Expectation.expectResolution(new global.PageInfo().load(),
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

    describe('#shouldLoad', function () {
        it('should assure that a default uri is not for loading a page automatically', () =>
            assert(!new global.PageInfo().shouldLoad())
        );

        it('should recognise a uri with a particular hash for loading a page automatically', () => {
            const originalLocation = document.location;

            try {
                const loadableUri = global.PageInfo.generateLoadingUrl(location.href);
                global.document.location = new URL(loadableUri);

                assert(new global.PageInfo().shouldLoad());
            }
            finally {
                document.location = originalLocation;
            }            
        });
    });

    describe('#getAllSavedPagesInfo', function () {
        it('should get previously saved page info items from the storage', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageInfo(), async expectedPageInfos => {
                const actualPageInfos = await global.PageInfo.getAllSavedPagesInfo();
                assert.deepStrictEqual(actualPageInfos, expectedPageInfos);
            })
        );
    });

    describe('#remove', function () {
        it('should remove previously saved page info items from the storage', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageInfo(5), async pageInfos => {
                const urisForRemoval = [pageInfos[0], pageInfos[pageInfos.length - 1]].map(pi => pi.uri);
                await global.PageInfo.remove(urisForRemoval);
                
                const actualPageInfos = await global.PageInfo.getAllSavedPagesInfo();
                assert.deepStrictEqual(actualPageInfos, pageInfos.filter(pi => !urisForRemoval.includes(pi.uri)));
            })
        );

        it('should remove nothing from the storage when passing an empty array of page uris', () =>
            Expectation.expectResolution(StorageHelper.saveTestPageInfo(5), async pageInfos => {
                await global.PageInfo.remove([]);
                
                const actualPageInfos = await global.PageInfo.getAllSavedPagesInfo();
                assert.deepStrictEqual(actualPageInfos, pageInfos);
            })
        );
    });
});
