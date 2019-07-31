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

class BrowserAPI {
    constructor() {
        this._isFirefox = true;
        this._api = this._chooseApi();

        this._menus = new ContextMenuAPI(this._api, this._isFirefox);
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

    get menus() { return this._menus; }

    get runtime() { return this._api.runtime; }

    get tabs() { return this._api.tabs; }

    get storage() { return this._api.storage; }
}
