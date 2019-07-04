export class StorageMocked {
    constructor () {
        this._items = {};
    }

    get(key) {
        return new Promise(resolve => resolve({ [key] : this._items[key] }));
    }

    set(keys) {
        return new Promise(resolve => {
            for (const key in keys)
                this._items[key] = keys[key];
            
            resolve(); 
        });
    }

    isEmpty() {
        return this.length === 0;
    }

    get length() {
        return Object.getOwnPropertyNames(this._items).length;
    }
}
