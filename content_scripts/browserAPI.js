class ContextMenuAPI {
    constructor(api, useIcons) {
        this._menus = api.contextMenus;

        this._useIcons = useIcons;
    }

    create(options) {
        if (!this._useIcons)
            delete options.icons;

        this._menus.create(options);
    }

    remove(id) {
        this._menus.remove(id);
    }

    update(id, options) {
        this._menus.update(id, options);
    }

    refresh() {
        if (this._menus.refresh)
            this._menus.refresh();
    }

    get onHidden() { return this._menus.onHidden || this._eventStub; }

    get _eventStub() {
        return {
            addListener: () => {}
        };
    }

    get onShown() { return this._menus.onShown || this._eventStub; }
}

class TabsAPI {
    constructor(api, useCallback) {
        this._tabs = api.tabs;

        this._useCallback = useCallback;
    }

    sendMessage(id, msg) {
        if (this._useCallback)
            return new Promise(resolve => this._tabs.sendMessage(id, msg, resolve));

        return this._tabs.sendMessage(id, msg);
    }

    getActiveTabs() {
        const options = { currentWindow: true, active: true };
        
        if (this._useCallback)
            return new Promise(resolve => this._tabs.query(options, resolve));

        return this._tabs.query(options);
    }
}

class RuntimeAPI {
    constructor(api, useCallback) {
        this._runtime = api.runtime;

        this._useCallback = useCallback;
    }

    sendMessage(id, msg) {
        if (this._useCallback)
            return new Promise(resolve => this._runtime.sendMessage(id, msg, resolve));

        return this._runtime.sendMessage(id, msg);
    }

    openOptionsPage() { this._runtime.openOptionsPage(); }

    onMessage(callback) { 
        if (this._useCallback) {
            this._runtime.onMessage.addListener((msg, sender, sendResponse) => {
                callback(msg).then(sendResponse);

                return true;
            });
        }
        
        this._runtime.onMessage.addListener(callback);
    }
}

class StorageSyncAPI {
    constructor(api, useCallback) {
        this._useCallback = useCallback;

        this._storage = api.storage.local;
    }

    set(obj) {
        if (this._useCallback)
            return new Promise(resolve => this._storage.set(obj, resolve));

        return this._storage.set(obj);
    }

    get(key) {
        if (this._useCallback)
            return new Promise(resolve => this._storage.get(key, resolve));

        return this._storage.get(key);
    }

    remove(keys) {
        if (this._useCallback)
            return new Promise(resolve => this._storage.remove(keys, resolve));

        return this._storage.remove(keys);
    }
}

class BrowserAPI {
    constructor() {
        this._isFirefox = true;
        this._api = this._chooseApi();

        this._menus = null;
        this._tabs = null;
        this._runtime = null;
        this._storage = null;
    }
    
    _chooseApi() {
        try {
            return browser;
        }
        catch (ex) {
            this._isFirefox = false;
            return chrome;
        }
    }

    get menus() { 
        if (!this._menus)
            this._menus = new ContextMenuAPI(this._api, this._useMenuIcons);

        return this._menus; 
    }

    get _useMenuIcons() { return this._isFirefox; }

    get runtime() { 
        if (!this._runtime)
            this._runtime = new RuntimeAPI(this._api, this._useCallback);
        
        return this._runtime; 
    }
    
    get _useCallback() { return !this._isFirefox; }

    get tabs() { 
        if (!this._tabs)
            this._tabs = new TabsAPI(this._api, this._useCallback);

        return this._tabs; 
    }

    get storage() { 
        if (!this._storage)
            this._storage = new StorageSyncAPI(this._api, this._useCallback);

        return this._storage; 
    }
}
