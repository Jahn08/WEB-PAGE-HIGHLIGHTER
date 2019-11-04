import { Randomiser } from './randomiser.js';

export class PageInfoHelper {
    static createPageInfoArray(numberOfItems = 3) {
        return this._createArray(numberOfItems, this._createRandomPageInfo, 'uri');
    }
    
    static _createArray(numberOfItems = 3, itemCreatorFn, keyProp) {
        const expectedData = [];

        const addedKeys = [];

        let i = 0;

        while (i < numberOfItems) {
            const newItem = itemCreatorFn(i);
            const key = newItem[keyProp];

            if (addedKeys.includes(key))
                continue;

            addedKeys.push(key);
            expectedData.push(newItem);

            ++i;
        }

        return expectedData;
    }

    static _createRandomPageInfo() {
        return {
            title: Randomiser.getRandomNumberUpToMax(),
            uri: 'https://test/' + Randomiser.getRandomNumber(10000000),
            date: new Date().setMonth(Randomiser.getRandomNumber(1000)),
            [PageInfo.HTML_PROP_NAME]: `<body>${Randomiser.getRandomNumberUpToMax()}</body>`
        };
    }

    static createCategoryArray(numberOfItems = 3, defaultIndex = null) {
        const defaultCategoryIndex = defaultIndex == null ? 
            Randomiser.getRandomNumber(numberOfItems - 1):
            defaultIndex;

        return this._createArray(numberOfItems, 
            index => this.createCategory('' + Randomiser.getRandomNumberUpToMax(), 
                defaultCategoryIndex === index), 'title');
    }

    static createCategory(title, isDefault) {
        return {
            title,
            default: isDefault
        };
    }

    static createPageCategoryArray(numberOfItems = 3, defaultIndex = null) {
        return this.buildPageCategories(this.createPageInfoArray(numberOfItems * 2), defaultIndex);
    }

    static buildPageCategories(pageInfo = [], defaultIndex = null) {
        const numberOfItems = pageInfo.length;

        const categories = this.createCategoryArray(Math.ceil(numberOfItems / 2), defaultIndex);
        const pageUris = pageInfo.map(p => p.uri);

        return { 
            pageCategories: categories.reduce((prev, cur, index) => {
                const pageIndex = index * 2;
                const pages = [pageUris[pageIndex]];

                const nextIndex = pageIndex + 1;

                if (nextIndex < numberOfItems)
                    pages.push(pageUris[nextIndex]);

                prev[cur.title] = pages;

                return prev;
            }, {}),
            categories
        };
    }

    static getUncategorisedPages(pagesInfo, pageCategories) {
        const categorisedUris = [];
        
        for (const categoryName in pageCategories)
            categorisedUris.push(...pageCategories[categoryName]);

        return pagesInfo.filter(p => !categorisedUris.includes(p.uri));
    }

    static fillPageCategories(pagesInfo, pageCategories) {
        const categorisedUris = this.buildCategorisedUris(pageCategories);
        ArrayExtension.runForEach(pagesInfo, pi => {
            const categoryTitle = categorisedUris[pi.uri];

            if (categoryTitle)
                pi.category = categoryTitle;
        });

        return pagesInfo;
    }

    static buildCategorisedUris(pageCategories = {}) {
        const categorisedUris = {};
        for (const categoryName in pageCategories)
            ArrayExtension.runForEach(pageCategories[categoryName], uri =>
                categorisedUris[uri] = categoryName);

        return categorisedUris;
    }
}
