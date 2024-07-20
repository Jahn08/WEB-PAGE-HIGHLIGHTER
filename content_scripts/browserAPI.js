class ContextMenuAPI {
    constructor(api, iconsSupported) {
        this._menus = api.contextMenus;

        this._iconsSupported = iconsSupported;
    }

    onClicked(callback) {
        this._menus.onClicked.addListener(callback);
    }

    create(options) {
        if (!this._iconsSupported)
            delete options.icons;

        this._menus.create(options);
    }

    remove(id) {
        this._menus.remove(id);
    }

    update(id, options) {
        this._menus.update(id, options);
    }
}

class TabsAPI {
    constructor(api) {
        this._tabs = api.tabs;
    }

    sendMessage(id, msg) {
        return this._tabs.sendMessage(id, msg);
    }

    getActiveTabs() {
        return this._tabs.query({ currentWindow: true, active: true });
    }
}

class RuntimeAPI {
    constructor(api, msgProcessedSynchronously) {
        this._runtime = api.runtime;

        this._msgProcessedSynchronously = msgProcessedSynchronously;
    }

    sendMessage(msg) {
        return this._runtime.sendMessage(undefined, msg);
    }

    _getLastError() {
        const error = this._runtime.lastError;

        if (!error)
            return null;

        return error instanceof Error ? error: new Error(JSON.stringify(error));
    }

    openOptionsPage() { this._runtime.openOptionsPage(); }

    onMessage(callback) { 
        if (this._msgProcessedSynchronously) {
            this._runtime.onMessage.addListener((msg, sender, sendResponse) => {
                callback(msg).then(sendResponse);

                return true;
            });

            return;
        }
        
        this._runtime.onMessage.addListener(callback);
    }

    onInstalled(callback) {
        this._runtime.onInstalled.addListener(callback);
    }

    logLastError(msgPrefix) {
        const error = this._getLastError();

        if (!error)
            return;

        console.error(`${msgPrefix}: ${error.toString()}`);
    }
}

class StorageSyncAPI {
    constructor(api) {
        this._storage = api.storage.local;
    }

    set(obj) {
        return this._storage.set(obj);
    }

    get(key) {
        return this._storage.get(key);
    }

    remove(keys) {
        return this._storage.remove(keys);
    }
}

class LocaleAPI {
    constructor(api) {
        this._locale = api.i18n;

        this._restrictionPattern = /-/g;
    }

    getString(key) {
        return this._getMessage(key);
    }

    _getMessage(key, ...args) {
        if (!key)
            return '';

        const properKey = ('' + key).replace(this._restrictionPattern, '_');
        return this._locale.getMessage(properKey, args.filter(a => a != null));
    }

    getStringWithArgs(key, arg1, arg2 = null) {
        return this._getMessage(key, arg1, arg2);
    }
}

export class BrowserAPI {
    constructor() {
        this._isFirefox = true;
        this._api = this._chooseApi();

        this._menus = null;
        this._tabs = null;
        this._runtime = null;
        this._storage = null;
        this._locale = null;
    }
    
    _chooseApi() {
        try {
            return browser;
        } catch (ex) {
            this._isFirefox = false;
            return chrome;
        }
    }

    get menus() { 
        if (!this._menus) {
            const menuIconsSupported = this._isFirefox;
            this._menus = new ContextMenuAPI(this._api, menuIconsSupported);
        }

        return this._menus; 
    }

    get runtime() { 
        if (!this._runtime) {
            const msgProcessedSynchronously = !this._isFirefox;
            this._runtime = new RuntimeAPI(this._api, msgProcessedSynchronously);
        }
        
        return this._runtime; 
    }
    
    get tabs() { 
        if (!this._tabs)
            this._tabs = new TabsAPI(this._api);

        return this._tabs; 
    }

    get storage() { 
        if (!this._storage)
            this._storage = new StorageSyncAPI(this._api);

        return this._storage; 
    }

    get locale() {
        if (!this._locale)
            this._locale = new LocaleAPI(this._api);

        return this._locale; 
    }
}
