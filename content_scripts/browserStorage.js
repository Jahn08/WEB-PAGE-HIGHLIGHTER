class BrowserStorage {
    constructor(key) {
        this._storage = browser.storage.sync;

        if (!this._storage)
            throw this._buildStorageError('The sync storage is unavailable. ' + 
                'Make sure the Add-ons option in Sync Settings is turned on');

        this._key = key;
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
        return new Promise(resolve => this._storage.get(this._key).
            then(obj => {
                let defaultObj = obj || {};

                if (defaultObj.length)
                    defaultObj = defaultObj[0];                

                resolve(defaultObj[this._key]);
            }));
    }

    get() {
        return this._find();
    }
}
