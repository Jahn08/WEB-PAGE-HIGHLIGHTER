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
        return LZWCompressor.compress(document.body.innerHTML);
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
        return LZWCompressor.decompress(serialisedHtml);
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

    static getAllSavedPagesWithCategories() {
        return this._getAllSavedPagesInfo();
    }

    static get _PAGE_CATEGORY_KEY() { return 'pageCategories'; }

    static _getAllSavedPagesInfo(includeHtml = false) {
        return BrowserStorage.getAll().then(objs => {
            const props = Object.getOwnPropertyNames(objs);

            const pagesInfo = [];

            const htmlPropName = this.HTML_PROP_NAME;

            const pageCategoryProp = this._PAGE_CATEGORY_KEY;
            let pageCategories;

            ArrayExtension.runForEach(props, prop => {
                if (prop === pageCategoryProp) {
                    pageCategories = objs[prop];
                    return;
                }

                if (!this._isUriValid(prop))
                    return;

                const obj = objs[prop];

                const pageInfo = {
                    uri: prop, 
                    title: obj.title,
                    date: obj.date
                };

                if (includeHtml)
                    pageInfo[htmlPropName] = obj[htmlPropName];
                
                pagesInfo.push(pageInfo);
            });

            return {
                pageCategories: pageCategories || {},
                pagesInfo
            };
        });
    }

    static getAllSavedPagesFullInfo() {
        return this._getAllSavedPagesInfo(true).then(info => {
            if (!info.pagesInfo.length)
                return info.pagesInfo;
            
            ArrayExtension.runForEach(info.pagesInfo, pi => {
                const categoryTitle = info.pageCategories[pi.uri];
                
                if (categoryTitle)
                    pi.category = categoryTitle;
            });

            return info.pagesInfo;
        });
    }

    static generateLoadingUrl(url) {
        return url + this._LOADING_HASH;
    }

    static remove(pageUris = []) {
        return BrowserStorage.remove(pageUris);
    }

    static async savePages(pagesInfo) {
        const htmlPropName = this.HTML_PROP_NAME;

        const importedFiles = [];
        const pageCategories = {};

        ArrayExtension.runForEach(pagesInfo, pi => {
            if (!this._isUriValid(pi.uri))
                return;
            
            pi.date = this._getValidTicks(pi.date);
            
            if (!pi.title)
                pi.title = this._fetchTitleFromUri(pi.uri);

            if (pi.category) {
                pageCategories[pi.uri] = pi.category;
                delete pi.category;
            }

            new BrowserStorage(pi.uri).set({
                [htmlPropName]: pi[htmlPropName],
                date: pi.date,
                title: pi.title
            });

            importedFiles.push(this._excludeHtml(pi));
        });

        const responses = await Promise.all([this._savePageCategories(pageCategories),
            this._saveCategories(pageCategories)]);
            
        return {
            importedPages: importedFiles,
            pageCategories: responses[0] || {},
            categories: responses[1] || []
        };
    }

    static _getValidTicks(ticks) {
        return isNaN(new Date(ticks)) ? Date.now() : ticks;
    }

    static _fetchTitleFromUri(uri) {
        const pathName = new URL(uri).pathname;
        const startIndex = pathName.lastIndexOf('/') + 1;
        
        if (!startIndex || startIndex === pathName.length)
            return 'Unknown';
        
        return pathName.substring(startIndex);
    }

    static _excludeHtml(pageInfo) {
        delete pageInfo[this.HTML_PROP_NAME];
        return pageInfo;
    }
    
    static async _savePageCategories(categorisedUris = {}) {
        if (!Object.getOwnPropertyNames(categorisedUris).length)
            return;

        const pageCategoryStorage = new BrowserStorage(this._PAGE_CATEGORY_KEY);
        const storedPageCategories = (await pageCategoryStorage.get()) || {};
            
        for (const uri in categorisedUris)
            storedPageCategories[uri] = categorisedUris[uri];
        
        await pageCategoryStorage.set(storedPageCategories);

        return storedPageCategories;
    }

    static async _saveCategories(categorisedUris = {}) {
        if (!Object.getOwnPropertyNames(categorisedUris).length)
            return;

        const newCategories = new Set(Object.values(categorisedUris));
        const categoryStorage = new BrowserStorage(this._CATEGORY_KEY);
        const storedCategories = (await categoryStorage.get()) || [];

        let newCategoryWasAdded = false;
        newCategories.forEach(val => {
            if (!storedCategories.find(c => c.title === val)) {
                storedCategories.push(this.createCategory(val));
                newCategoryWasAdded = true;
            }
        });

        if (newCategoryWasAdded)
            await categoryStorage.set(storedCategories);

        return storedCategories;
    }

    static createCategory(title, isDefault = false) {
        return  {
            default: isDefault,
            title
        };
    }

    static getAllSavedCategories() {
        return new BrowserStorage(this._CATEGORY_KEY).get();
    }

    static get _CATEGORY_KEY() { return 'categories'; }

    static saveCategories(data) {
        return new BrowserStorage(this._CATEGORY_KEY).set(data);
    }

    static savePageCategories(data) {
        return new BrowserStorage(this._PAGE_CATEGORY_KEY).set(data);
    }
}
