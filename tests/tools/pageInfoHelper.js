import { Randomiser } from './randomiser.js';

export class PageInfoHelper {
    static createPageInfoArray(numberOfItems = 3) {
        const expectedPageData = [];

        const addedUris = [];

        let i = 0;

        while (i < numberOfItems) {
            const pageInfo = this.createPageInfo();
            
            if (addedUris.includes(pageInfo.uri))
                continue;

            addedUris.push(pageInfo.uri);
            expectedPageData.push(pageInfo);

            ++i;
        }

        return expectedPageData;
    }
    
    static createPageInfo() {
        return {
            title: Randomiser.getRandomNumberUpToMax(),
            uri: 'https://test/' + Randomiser.getRandomNumber(10000000),
            date: new Date().setMonth(Randomiser.getRandomNumber(1000)),
            [PageInfo.HTML_PROP_NAME]: `<body>${Randomiser.getRandomNumberUpToMax()}</body>`
        };
    }
}
