class PageInfo {
    constructor () {
        this._uri = this._computeUri();
        this._storage = null;
    }

    _computeUri() {
        const location = document.location;
        return location.origin + location.pathname;
    }

    static get HTML_PROP_NAME() { 
        return 'htmlBase64'; 
    }

    save() {
        return this._browserStorage.set(this._serialise());
    }

    get _browserStorage() {
        if (!this._storage)
            this._storage = new BrowserStorage(this._uri);

        return this._storage;
    }

    _serialise() {
        return { 
            date: Date.now(),
            title: document.title,
            [PageInfo.HTML_PROP_NAME]: this._serialisedHtml
        };
    }

    get _serialisedHtml() {
        return btoa(unescape(encodeURIComponent(document.body.innerHTML)));
    }

    async canLoad() {
        return await this._browserStorage.contains();
    }

    async load() {
        const pageData = await this._browserStorage.get();

        let serialisedHtml;

        if (!pageData || !(serialisedHtml = pageData[PageInfo.HTML_PROP_NAME]))
            this._throwNoContentError();

        this._renderHtml(this._deserialiseHtml(serialisedHtml));
    }

    _throwNoContentError() {
        const error = new Error('There is no HTML contents to write');
        error.name = 'WrongHtmlError';

        throw error;
    }

    _deserialiseHtml(serialisedHtml) {
        return decodeURIComponent(escape(atob(serialisedHtml)));
    }

    _renderHtml(html) {
        if (!html)
            this._throwNoContentError();

        document.body.innerHTML = html;
    }

    static _isUriValid(uri) {
        try {
            new URL(uri);
            return true;
        }
        catch (ex) {
            return false;
        }
    }

    shouldLoad() {
        return document.location.hash === PageInfo._LOADING_HASH;
    }

    static get _LOADING_HASH() {
        return '#highlighterPageLoading';
    }

    static getAllSavedPagesInfo() {
        return BrowserStorage.getAll().then(objs => {
            const props = Object.getOwnPropertyNames(objs);

            const pagesInfo = [];

            ArrayExtension.runForEach(props, prop => {
                if (!this._isUriValid(prop))
                    return;

                const obj = objs[prop];
                
                pagesInfo.push({
                    uri: prop, 
                    title: obj.title,
                    date: obj.date 
                });
            });

            return pagesInfo;
        });
    }

    static generateLoadingUrl(url) {
        return url + this._LOADING_HASH;
    }

    static remove(pageUris = []) {
        return BrowserStorage.remove(pageUris);
    }
}
