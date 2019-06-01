class BrowserStorage {
    constructor(key) {
        this._storage = localStorage; //browser.storage.sync;

        if (!this._storage)
            throw new Error('The sync storage is unavailable. ' + 
                'Make sure the Add-ons option in Sync Settings is turned on');

        this._key = key;
    }

    set(object) {
        return new Promise(resolve => {
            this._storage.setItem(this._key, JSON.stringify(object));
            resolve();
        });
        // return PageStorage._storage.set(new PageInfo().serialise());
    }

    contains() {
        return this._find(key).then(obj => obj != null);
    }

    _find() {
        return new Promise(resolve => resolve(this._storage.getItem(this._key)));
    }

    get() {
        return this._find().then(obj => {
            if (!obj)
                throw new Error('No data has been found for the current uri');

            return JSON.parse(obj);
        });
    }
}
