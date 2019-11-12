import assert from 'assert';
import { EnvLoader } from '../tools/envLoader';
import { TestPageHelper } from '../tools/testPageHelper';
import { Expectation } from '../tools/expectation';

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

        const testCompressing = compressor => {
            const originalHtml = document.body.outerHTML;

            const outcome = compressor.compress(originalHtml);
            assert(outcome);
            assert(outcome.length < originalHtml.length);
        };

        it('should compress an html string making it shorter with the dictionary of 256 symbols', 
            () => testCompressing(new LZWCompressor())
        );

        it('should compress an html string making it shorter with the dictionary of 16384 symbols', 
            () => testCompressing(LZWCompressor.x14Dictionary)
        );
    });

    describe('#decompress', function() {

        const testDecompressingHtml = (compressor, decompressor = null) => {
            decompressor = decompressor || compressor; 
            const originalHtml = document.body.outerHTML;

            const outcome = decompressor.decompress(compressor.compress(originalHtml));
            assert.strictEqual(outcome, originalHtml);
        };

        it('should decompress an html string with the dictionary of 256 symbols',
            () => testDecompressingHtml(new LZWCompressor()));

        it('should decompress an html string with the dictionary of 16384 symbols', 
            () => testDecompressingHtml(LZWCompressor.x14Dictionary));

        it('should throw an error when decompressing with another dictionary size', 
            () => Expectation.expectError(() => {
                testDecompressingHtml(new LZWCompressor(), LZWCompressor.x14Dictionary);
            }, { code: new assert.AssertionError({}).code })
        );

        it('should decompress strings as parts of an object in JSON', () => {
            const originalHtml = document.body.outerHTML;

            const compressor = LZWCompressor.x14Dictionary;

            const originalObj = {
                htmlCompressed: compressor.compress(originalHtml), 
                paragraph: TestPageHelper.getLastParagraphSentenceNode().innerHTML,
                sentence: TestPageHelper.getFirstItalicSentenceNode().innerHTML
            };

            const originalObjJson = JSON.stringify(originalObj);
            const obj = JSON.parse(originalObjJson);
            assert.strictEqual(obj.htmlCompressed, originalObj.htmlCompressed);
            assert.strictEqual(compressor.decompress(obj.htmlCompressed), originalHtml);
        });
    });
});
