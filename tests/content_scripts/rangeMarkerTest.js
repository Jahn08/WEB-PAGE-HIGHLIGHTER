import assert from 'assert';
import { Randomiser } from '../tools/randomiser';
import { EnvLoader } from '../tools/envLoader';

describe('content_script/rangeMarker', function () {
    this.timeout(0);

    before(done => {
        EnvLoader.loadClass('./content_scripts/rangeMarker.js', 'RangeMarker')
            .then(() => done())
            .catch(done);
    });

    beforeEach(done => {
        EnvLoader.loadDomModel().then(() => done()).catch(done);
    });
    
    afterEach(done => {
        EnvLoader.unloadDomModel();
        done();
    });

    describe('#isNodeMarked', () =>
        it('should determine if nodes are marked or not', function () {
            const rangeMarker = new RangeMarker();
            
            document.querySelectorAll('.article--paragraph--sentence--label').forEach(n => 
                assert(rangeMarker.isNodeMarked(n) === false));

            const italicNodes = document.querySelectorAll('.article--paragraph--sentence--italic');
            italicNodes.forEach(n => {
                n.classList.add(RangeMarker.markerClass);
                assert(rangeMarker.isNodeMarked(n) === true);
            });

            let markedSentencesCount = 0;

            document.querySelectorAll('.article--paragraph--sentence').forEach(n => {
                if (rangeMarker.isNodeMarked(n)) 
                    ++markedSentencesCount;
            });

            assert.strictEqual(markedSentencesCount, italicNodes.length);
        })
    );

    describe('#markSelectedNodes', function () {
        
        const testMarking = function (setRangeContainersCallback, expectedMarkersNumber,
            expectedText) {
            const rangeMarker = new RangeMarker();
                    
            const range = document.createRange();
            setRangeContainersCallback(range);

            const colourClass = `${RangeMarker.markerClass}_${Randomiser.getRandomNumber(1000)}`;
            rangeMarker.markSelectedNodes(colourClass);            
            
            setRangeContainersCallback(range);

            const markColours = rangeMarker.getColourClassesForSelectedNodes();
            assert(markColours);
            assert.strictEqual(markColours.length, 1);
            assert.strictEqual(markColours[0], colourClass);

            const markedNodes = [...document.querySelectorAll(`.${RangeMarker.markerContainerClass} .${RangeMarker.markerClass}`)];
            assert.strictEqual(markedNodes.length, expectedMarkersNumber);

            const markedText = markedNodes.reduce((p, c) => 
                (p.textContent ? p.textContent: p) + c.textContent);

            assert.strictEqual(markedText.replace(/\s+/gm, ' ').trim(), expectedText);
        };

        it('should mark text over entirely selected nodes', () =>
            testMarking(range => {
                range.setStart(document.querySelector('.article--paragraph--sentence--label'));
                range.setEnd(document.querySelector('.article--paragraph--sentence--bold--italic'));
            }, 5, 'can extend and modify the capability of a browser. ' + 
                'Extensions for Firefox are built using the WebExtensions API, ' + 
                'a cross-browser system for developing')
        );

        it('should mark over partly selected nodes', () => {
            testMarking(range => {
                range.setStart(document.querySelector('.article--paragraph--sentence--italic'), 37);
                range.setEnd(document.querySelector('.article--paragraph--sentence--bold--italic'), 37);
            }, 3, 'or Firefox are built using the WebExtensions API, a cross-browser system f')
        });

        it('should mark over partly selected nodes in different paragraphs', () => {
            testMarking(range => {
                range.setStart(document.querySelector('.article--paragraph--sentence--italic'), 26);
                range.setEnd(document.querySelector('#article--paragraph-last .article--paragraph--sentence'), 30);
            }, 9, 'xtensions for Firefox are built using the WebExtensions API, ' + 
                'a cross-browser system for developing extensions. ' + 
                'To a large extent the system is compatible with the extension ' + 
                'API supported by Google Chrome and Opera and the W3C ' + 
                'Draft Community Group. Extensions written for these browsers ' + 
                'will in most cases run in Firefox or Microsoft Edge with just')
        });

    });
});
