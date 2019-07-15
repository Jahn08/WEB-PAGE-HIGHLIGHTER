import { Randomiser } from '../tools/randomiser.js';

export class PageInfoHelper {
    static setTestPageInfoToStorage (numberOfItems = 3) {
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
