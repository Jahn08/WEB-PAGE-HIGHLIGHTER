export class StorageMocked {
    constructor () {
        this._items = {};
    }

    get(key) {
        return new Promise(resolve =>
            resolve(key ? { [key] : this._copyObject(this._items[key]) }: 
                this._copyObject(this._items))
        );
    }

    _copyObject(content) {
        if (!content)
            return content;
        
        return JSON.parse(JSON.stringify(content));
    }

    set(keys) {
        return new Promise(resolve => {
            for (const key in keys)
                this._items[key] = this._copyObject(keys[key]);
            
            resolve(); 
        });
    }

    remove(keys) {
        return new Promise(resolve => {
            keys = keys || [];

            keys.forEach(k => {
                delete this._items[k];
            });

            resolve(); 
        });
    }

    isEmpty() {
        return this.length === 0;
    }

    get length() {
        return Object.getOwnPropertyNames(this._items).length;
    }

    clear() {
        this._items = {};
    }
}
