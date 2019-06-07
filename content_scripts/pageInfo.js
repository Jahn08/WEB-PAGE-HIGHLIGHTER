class PageInfo {
    constructor () {
        this._uri = document.location.href;
        this._storage = null;
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
        const page = { date: Date.now() };
        page[PageInfo.HTML_PROP_NAME] = this._serialisedHtml;

        return page;
    }

    get _serialisedHtml() {
        return btoa(unescape(encodeURIComponent(document.documentElement.innerHTML)));
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

        document.documentElement.innerHTML = html;
    }
}
