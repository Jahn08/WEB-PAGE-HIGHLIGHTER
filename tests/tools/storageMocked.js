export class StorageMocked {
    constructor () {
        this._items = {};

        global.localStorage = {
            getItem: (key) => this._items[key],
            setItem: (key, value) => this._items[key] = value
        }
    }

    isEmpty() {
        return this.length === 0;
    }

    get length() {
        return Object.getOwnPropertyNames(this._items).length;
    }

    dispose() {
        global.localStorage = undefined;
    }
}
