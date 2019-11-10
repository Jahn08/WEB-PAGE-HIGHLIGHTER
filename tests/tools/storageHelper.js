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

    static async saveTestPageEnvironment(pageNumber = 3, hasDefaultCategory = true) {
        const expectedPageData = await this.saveTestPageInfo(pageNumber); 
        
        const defaultCategoryIndex = hasDefaultCategory ? undefined: -1;
        const pageCategories = await this._savePageCategories(
            PageInfoHelper.buildPageCategories(expectedPageData, defaultCategoryIndex));

        return {
            pagesInfo: expectedPageData,
            pageCategories 
        }; 
    }

    static saveTestPageInfo(numberOfItems = 3, predeterminedUri = null) {
        if (!numberOfItems)
            return Promise.resolve([]);

        const expectedPageData = PageInfoHelper.createPageInfoArray(numberOfItems);

        if (predeterminedUri)
            expectedPageData[0].uri = predeterminedUri;

        return Promise.all(expectedPageData.map(pi => new BrowserStorage(pi.uri).set(pi)))
            .then(() => { return expectedPageData; });
    }

    static saveTestCategories(numberOfItems = 3) {
        if (!numberOfItems)
            return Promise.resolve();

        return this._saveCategories(PageInfoHelper.createCategoryArray(numberOfItems));
    }

    static _saveCategories(categories = []) {
        return new BrowserStorage('categories').set(categories)
            .then(() => { return categories; });
    }

    static saveTestPageCategories(numberOfItems = 3, defaultCategoryIndex = null) {
        if (!numberOfItems)
            return Promise.resolve();

        return this._savePageCategories(
            PageInfoHelper.createPageCategories(numberOfItems, defaultCategoryIndex));
    }

    static _savePageCategories(categoryInfo) {
        return this._saveCategories(categoryInfo.categories).then(() => {
            return new BrowserStorage('pageCategories').set(categoryInfo.pageCategories)
                .then(() => { return categoryInfo.pageCategories; });
        });
    }
}
