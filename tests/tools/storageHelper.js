import { Randomiser } from './randomiser.js';
import { PageInfoHelper } from './pageInfoHelper.js';

export class StorageHelper {
    static saveRandomObjects(numberOfItems = 3) {
        const expectedPageData = [];

        for (let i = 0; i < numberOfItems; ++i)
            expectedPageData.push(this._createRandomObject());

        return Promise.all(expectedPageData
            .map(obj => new BrowserStorage(obj.key).set(obj)))
            .then(() => { return expectedPageData; });
    }

    static _createRandomObject() {
        return { 
            key: Randomiser.getRandomNumberUpToMax(),
            value: Randomiser.getRandomNumberUpToMax()
        };
    }

    static saveTestPageInfo (numberOfItems = 3) {
        const expectedPageData = PageInfoHelper.createPageInfoArray(numberOfItems);

        return Promise.all(expectedPageData.map(pi => new BrowserStorage(pi.uri).set(pi)))
            .then(() => { return expectedPageData; });
    }
}
