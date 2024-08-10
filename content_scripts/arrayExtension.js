export class ArrayExtension {
    static runForEach(array, callback) {
        if (!callback)
            return;

        const length = (array || []).length;
        
        for (let i = 0; i < length; ++i)
            callback(array[i], i);
    }

    static contains(array, element) {
        const length = (array || []).length;

        for (let i = 0; i < length; ++i)
            if (array[i] === element)
                return true;

        return false;
    }

    static sortAsc(array, fieldName) {
        return this._sortByField(array, fieldName, true);
    }

    static _sortByField(array, fieldName, asc) {
        if (!array || !fieldName)
            return array;

        return asc ? array.sort((a, b) => a[fieldName] > b[fieldName] ? 1 : (a[fieldName] < b[fieldName] ? -1: 0)):
            array.sort((a, b) => b[fieldName] > a[fieldName] ? 1 : (b[fieldName] < a[fieldName] ? -1: 0));
    }

    static sortDesc(array, fieldName) {
        return this._sortByField(array, fieldName, false);
    }
}
