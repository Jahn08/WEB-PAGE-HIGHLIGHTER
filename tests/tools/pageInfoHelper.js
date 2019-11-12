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
            uri: Randomiser.getRandomUri(),
            date: new Date().setMonth(Randomiser.getRandomNumber(1000)),
            [PageInfo.HTML_PROP_NAME]: `<body>${Randomiser.getRandomNumberUpToMax()}</body>`,
            [PageInfo.DIC_SIZE_PROP_NAME]: undefined
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

    static createPageCategories(numberOfItems = 3, defaultIndex = null) {
        return this.buildPageCategories(this.createPageInfoArray(numberOfItems * 2), defaultIndex);
    }

    static buildPageCategories(pageInfo = [], defaultIndex = null) {
        const numberOfItems = pageInfo.length;

        const categories = this.createCategoryArray(Math.ceil(numberOfItems / 2), defaultIndex);
        const pageUris = pageInfo.map(p => p.uri);

        return { 
            pageCategories: categories.reduce((prev, cur, index) => {
                const pageIndex = index * 2;
                const _uris = [pageUris[pageIndex]];

                const nextIndex = pageIndex + 1;

                if (nextIndex < numberOfItems)
                    _uris.push(pageUris[nextIndex]);

                _uris.forEach(uri => prev[uri] = cur.title);
                return prev;
            }, {}),
            categories
        };
    }

    static getUncategorisedPages(pagesInfo, pageCategories) {
        return pagesInfo.filter(pi => !pageCategories[pi.uri]);
    }

    static getCategoryPages(pageCategories, categoryTitle) {
        return Object.entries(pageCategories)
            .filter(e => e[1] === categoryTitle).map(e => e[0]);
    }

    static fillPageCategories(pagesInfo, pageCategories) {
        pagesInfo.forEach(pi => {
            const categoryTitle = pageCategories[pi.uri];

            if (categoryTitle)
                pi.category = categoryTitle;
        });

        return pagesInfo;
    }
}
