import { Randomiser } from './randomiser.js';

export class StorageHelper {
    static saveRandomObjects(numberOfItems = 3) {
        const expectedPageData = [];

        for (let i = 0; i < numberOfItems; ++i)
            expectedPageData.push(this._createRandomObject());

        return Promise.all(expectedPageData
            .map(obj => new global.BrowserStorage(obj.key).set(obj)))
            .then(() => { return expectedPageData; });
    }

    static _createRandomObject() {
        return { 
            key: Randomiser.getRandomNumberUpToMax(),
            value: Randomiser.getRandomNumberUpToMax()
        };
    }

    static saveTestPageInfo (numberOfItems = 3) {
        const expectedPageData = [];

        const addedUris = [];

        let i = 0;

        while (i < numberOfItems) {
            const pageInfo = this._createTestPageInfo();

            if (addedUris.includes(pageInfo.uri))
                continue;

            addedUris.push(pageInfo.uri);
            expectedPageData.push(pageInfo);

            ++i;
        }

        return Promise.all(expectedPageData.map(pi => new global.BrowserStorage(pi.uri).set(pi)))
            .then(() => { return expectedPageData; });
    }

    static _createTestPageInfo () {
        return {
            title: Randomiser.getRandomNumberUpToMax(),
            uri: 'https://test/' + Randomiser.getRandomNumber(10000000),
            date: new Date().setMonth(Randomiser.getRandomNumber(1000))
        };
    }
}
