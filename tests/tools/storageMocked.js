export class StorageMocked {
    constructor () {
        this._items = {};

        global.localStorage = {
            getItem: (key) => this._items[key],
            setItem: (key, value) => this._items[key] = value
        }
    }

    isEmpty() {
        return Object.getOwnPropertyNames(this._items).length === 0;
    }
}
