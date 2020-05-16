// eslint-disable-next-line no-unused-vars
class BrowserStorage {
    constructor(key) {
        this._storage = BrowserStorage._syncStorage;
        
        if (!this._storage)
            throw this._buildStorageError('The sync storage is unavailable. ' + 
                'Make sure the Add-ons option in Sync Settings is turned on');

        this._key = key;
    }

    static get _syncStorage() {
        if (!this._api)
            this._api = new BrowserAPI();

        return this._api.storage;
    }

    _buildStorageError(msg, name = 'StorageError') {
        const err = new Error(msg);
        err.name = name;

        return err;
    }

    set(object) {
        return this._storage.set({ [this._key]: object });
    }

    contains() {
        return this._find().then(obj => obj != null);
    }

    _find() {
        return BrowserStorage._find(this._key).then(obj => obj[this._key]);
    }

    get() {
        return this._find();
    }

    static _find(key = null) {
        return this._syncStorage.get(key).then(obj => {
            let defaultObj = obj || {};

            if (defaultObj.length)
                defaultObj = defaultObj[0];                

            return defaultObj;
        });
    }

    static getAll() {
        return this._find();
    }

    static remove(keys) {
        if (!keys || !keys.length)
            return Promise.resolve();

        return this._syncStorage.remove(keys);
    }
}