import assert from 'assert';
import { EnvLoader } from '../tools/envLoader';
import { TestPageHelper } from '../tools/testPageHelper';

describe('content_script/lzwCompressor', function() {
    
    before(done => {
        EnvLoader.loadClass('./content_scripts/lzwCompressor.js', 'LZWCompressor')
            .then(() => done())
            .catch(done);
    });
    
    beforeEach('loadResources', done => {
        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });
    
    afterEach('releaseResources', () => {        
        EnvLoader.unloadDomModel();
    });

    describe('#compress', function() {

        it('should compress an html string making it shorter', () => {
            const originalHtml = document.body.outerHTML;

            const outcome = LZWCompressor.compress(originalHtml);
            assert(outcome);
            assert(outcome.length < originalHtml.length);
        });
    });

    describe('#decompress', function() {

        it('should decompress an html string producing its initial string source', () => {
            const originalHtml = document.body.outerHTML;

            const outcome = LZWCompressor.decompress(LZWCompressor.compress(originalHtml));
            assert.strictEqual(outcome, originalHtml);
        });

        it('should decompress strings as parts of an object in JSON', () => {
            const originalHtml = document.body.outerHTML;

            const originalObj = {
                htmlCompressed: LZWCompressor.compress(originalHtml), 
                paragraph: TestPageHelper.getLastParagraphSentenceNode().innerHTML,
                sentence: TestPageHelper.getFirstItalicSentenceNode().innerHTML
            };

            const originalObjJson = JSON.stringify(originalObj);
            const obj = JSON.parse(originalObjJson);
            assert.strictEqual(obj.htmlCompressed, originalObj.htmlCompressed);
            assert.strictEqual(LZWCompressor.decompress(obj.htmlCompressed), originalHtml);
        });
    });
});
