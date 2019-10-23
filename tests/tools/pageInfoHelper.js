import { Randomiser } from './randomiser.js';

export class PageInfoHelper {
    static createPageInfoArray(numberOfItems = 3) {
        return this._createArray(numberOfItems, this.createPageInfo, 'uri');
    }
    
    static _createArray(numberOfItems = 3, itemCreatorFn, keyProp) {
        const expectedData = [];

        const addedKeys = [];

        let i = 0;

        while (i < numberOfItems) {
            const newItem = itemCreatorFn();
            const key = newItem[keyProp];

            if (addedKeys.includes(key))
                continue;

            addedKeys.push(key);
            expectedData.push(newItem);

            ++i;
        }

        return expectedData;
    }

    static createPageInfo() {
        return {
            title: Randomiser.getRandomNumberUpToMax(),
            uri: 'https://test/' + Randomiser.getRandomNumber(10000000),
            date: new Date().setMonth(Randomiser.getRandomNumber(1000)),
            [PageInfo.HTML_PROP_NAME]: `<body>${Randomiser.getRandomNumberUpToMax()}</body>`
        };
    }

    static createCategoryArray(numberOfItems = 3) {
        return this._createArray(numberOfItems, this.createCategory, 'title');
    }

    static createCategory() {
        return {
            title: '' + Randomiser.getRandomNumberUpToMax(),
            isDefault: Randomiser.getRandomBoolean()
        };
    }
}
