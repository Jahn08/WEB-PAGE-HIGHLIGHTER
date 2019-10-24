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

    static createCategoryArray(numberOfItems = 3) {
        const defaultCategoryIndex = Randomiser.getRandomNumber(numberOfItems - 1);

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
}
