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
        it('should mark text over entirely selected nodes', function () {
            const rangeMarker = new RangeMarker();
            
            const range = document.createRange();
            
            const setRangeContainers = () => {
                range.setStart(document.querySelector('.article--paragraph--sentence--label'));

                const endNode = document.querySelector('.article--paragraph--sentence--bold--italic');
                range.setEnd(endNode);
            };
            
            setRangeContainers();

            const colourClass = `${RangeMarker.markerClass}_${Randomiser.getRandomNumber(1000)}`;
            rangeMarker.markSelectedNodes(colourClass);            
            
            setRangeContainers();

            const markColours = rangeMarker.getColourClassesForSelectedNodes();
            assert(markColours);
            assert.strictEqual(markColours.length, 1);
            assert.strictEqual(markColours[0], colourClass);

            const markedNodes = document.querySelectorAll(`.${RangeMarker.markerContainerClass} .${RangeMarker.markerClass}`);
            assert.strictEqual(markedNodes.length, 5);
        })
    });
});
