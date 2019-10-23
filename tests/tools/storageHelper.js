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

    static saveTestPageInfo(numberOfItems = 3, predeterminedUri = null) {
        if (!numberOfItems)
            return Promise.resolve();

        const expectedPageData = PageInfoHelper.createPageInfoArray(numberOfItems);

        if (predeterminedUri)
            expectedPageData[0].uri = predeterminedUri;

        return Promise.all(expectedPageData.map(pi => new BrowserStorage(pi.uri).set(pi)))
            .then(() => { return expectedPageData; });
    }

    static saveTestCategories(numberOfItems = 3, predeterminedTitle = null) {
        if (!numberOfItems)
            return Promise.resolve();

        const expectedData = PageInfoHelper.createCategoryArray(numberOfItems);

        if (predeterminedTitle)
            expectedData[0].title = predeterminedTitle;
        
        return new BrowserStorage('categories').set(expectedData)
            .then(() => { return expectedData; });
    }
}
