import assert from 'assert';
import { Randomiser } from '../tools/randomiser';

describe('content_script/arrayExtension', function() {

    const buildRandomArray = () => {
        const length = Randomiser.getRandomNumber(100) || 10;
        const array = new Array(length);

        for (let i = 0; i < length; ++i)
            array[i] = Randomiser.getRandomNumberUpToMax();

        return array;
    };

    describe('#runForEach', function() {

        it('should run a callback for each item in an array', () => {
            const array = buildRandomArray();

            let index = 0;
            ArrayExtension.runForEach(array, () => ++index);

            assert.strictEqual(index, array.length);
        });

        it('should do nothing if there is no array or callback passed', () => {
            const array = buildRandomArray();
            assert.doesNotThrow(() => ArrayExtension.runForEach(array));

            let index = 0;
            assert.doesNotThrow(() => ArrayExtension.runForEach(undefined, () => ++index));
            assert.strictEqual(index, 0);
        });

        it('should do nothing when there is a different object passed instead of an array ',
            () => {
                let index = 0;
                assert.doesNotThrow(() => ArrayExtension.runForEach(Randomiser.getRandomNumberUpToMax(),
                    () => ++index));
                assert.strictEqual(index, 0);
            });
    });


    describe('#contains', function() {

        it('should return true for an element contained in an array', () => {
            const array = buildRandomArray();
            const someValue = Randomiser.getRandomArrayItem(array);

            assert.strictEqual(ArrayExtension.contains(array, someValue), true);
        });

        it('should return false for an element absent from an array', () =>
            assert.strictEqual(ArrayExtension.contains(
                buildRandomArray(), Randomiser.getRandomNumberUpToMax()), false)
        );

        it('should return false if there is no array passed', () =>
            assert.strictEqual(ArrayExtension.contains(undefined, 
                Randomiser.getRandomNumberUpToMax()), false)
        );

        it('should return false when there is a different object passed instead of an array', 
            () => assert.strictEqual(ArrayExtension.contains({}, 
                Randomiser.getRandomNumberUpToMax()), false)
        );
    });
});