class Category {
    static async upsert(categorisedUris = {}) {
        if (!Object.getOwnPropertyNames(categorisedUris).length)
            return;

        const newCategories = new Set(Object.values(categorisedUris));
        const categoryStorage = this._createStorage();
        const storedCategories = (await categoryStorage.get()) || [];

        let newCategoryWasAdded = false;
        newCategories.forEach(val => {
            if (!storedCategories.find(c => c.title === val)) {
                storedCategories.push(this._createCategory(val));
                newCategoryWasAdded = true;
            }
        });

        if (newCategoryWasAdded)
            await categoryStorage.set(storedCategories);

        return storedCategories;
    }

    static _createCategory(title, isDefault = false) {
        return  {
            default: isDefault,
            title
        };
    }

    static _createStorage() {
        return new BrowserStorage('categories');
    }

    static get() {
        return this._createStorage().get();
    }

    static save(data) {
        return this._createStorage().set(data);
    }
}

class CategoryView {
    constructor(categories = []) {
        this.categoryTitles = [];
        this._defaultCategoryTitle = null;

        ArrayExtension.runForEach(categories, cat => {
            const title = cat.title;

            if (cat.default)
                this._defaultCategoryTitle = title;

            this.categoryTitles.push(title);
        });
    }

    get defaultCategoryTitle() { return this._defaultCategoryTitle; }
}

class PageCategory {
    constructor(uri) {
        this._uri = uri;
        this._storage = null;

        this._category = null;
    }

    get category() { return this._category; }

    async load() {
        this._category = await this._getPageCategory();
    }

    async _getPageCategory() {
        const pageCategories = await PageCategory._getPageCategories(this._browserStorage);
        return pageCategories[this._uri];
    }

    static async _getPageCategories(storage) {
        return (await storage.get()) || {};
    }

    get _browserStorage() {
        if (!this._storage)
            this._storage = PageCategory._createStorage();

        return this._storage;
    }

    static _createStorage() {
        return new BrowserStorage('pageCategories');
    }

    async update(categoryTitle) {
        if (this._category == categoryTitle)
            return;

        const pageCategories = await PageCategory._getPageCategories(this._browserStorage);

        if (categoryTitle)
            pageCategories[this._uri] = categoryTitle;
        else
            delete pageCategories[this._uri];
        
        await this._browserStorage.set(pageCategories);

        this._category = categoryTitle;
    }

    static async upsert(categorisedUris = {}) {
        if (!Object.getOwnPropertyNames(categorisedUris).length)
            return;

        const pageCategoryStorage = this._createStorage();
        const storedPageCategories = await this._getPageCategories(pageCategoryStorage);
            
        for (const uri in categorisedUris)
            storedPageCategories[uri] = categorisedUris[uri];
        
        await pageCategoryStorage.set(storedPageCategories);

        return storedPageCategories;
    }
    
    static save(data) {
        return this._createStorage().set(data);
    }

    static get() {
        return this._createStorage().get();
    }
}

class PageInfo {
    constructor () {
        this._uri = this._computeUri();
        this._storage = null;

        this._pageIsStored = false;

        this._pageCategory = new PageCategory(this._uri);
    }

    get uri() { return this._uri; }

    _computeUri() {
        const location = document.location;
        return location.origin + location.pathname;
    }

    static get HTML_PROP_NAME() { 
        return 'htmlBase64'; 
    }

    static get DIC_SIZE_PROP_NAME() { 
        return 'dictionarySize'; 
    }

    async saveToCategory(categoryTitle) {
        await this._pageCategory.update(categoryTitle);

        return this._saveInternally();
    }

    async _saveInternally() {
        await this._browserStorage.set(this._serialise());
        return this._pageCategory.category;
    }

    async save(defaultCategoryTitle = null) {
        if (!this._pageIsStored && defaultCategoryTitle)
            await this._pageCategory.update(defaultCategoryTitle);

        return this._saveInternally();
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
            [PageInfo.HTML_PROP_NAME]: this._serialisedHtml,
            [PageInfo.DIC_SIZE_PROP_NAME]: LZWCompressor.X14_DICTIONARY_SIZE
        };
    }

    get _serialisedHtml() {
        return LZWCompressor.x14Dictionary.compress(document.body.innerHTML);
    }

    async canLoad() {
        return (this._pageIsStored = await this._browserStorage.contains());
    }

    async load() {
        const pageData = await this._browserStorage.get();

        let serialisedHtml;

        if (!pageData || !(serialisedHtml = pageData[PageInfo.HTML_PROP_NAME]))
            this._throwNoContentError();

        this._renderHtml(this._deserialiseHtml(serialisedHtml, pageData[PageInfo.DIC_SIZE_PROP_NAME]));

        this._pageCategory.load();
    }

    _throwNoContentError() {
        const error = new Error('There is no HTML contents to write');
        error.name = 'WrongHtmlError';

        throw error;
    }

    _deserialiseHtml(serialisedHtml, dictionarySize) {
        return new LZWCompressor(dictionarySize).decompress(serialisedHtml);
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
        const uriObj = new URL(location.href);

        if (uriObj.searchParams.get(PageInfo._LOADING_PARAM)) {
            uriObj.searchParams.delete(PageInfo._LOADING_PARAM);
            history.pushState('', '', uriObj.toString());

            return true;
        }

        return false;
    }

    static get _LOADING_PARAM() {
        return 'highlighterPageLoading';
    }

    static getAllSavedPagesWithCategories() {
        return this._getAllSavedPagesInfo();
    }

    static async _getAllSavedPagesInfo(includeHtml = false) {
        const objs = await BrowserStorage.getAll();
    
        const props = Object.getOwnPropertyNames(objs);

        const pagesInfo = [];

        const htmlPropName = this.HTML_PROP_NAME;
        const dicSizePropName = this.DIC_SIZE_PROP_NAME;

        ArrayExtension.runForEach(props, prop => {
            if (!this._isUriValid(prop))
                return;

            const obj = objs[prop];

            const pageInfo = {
                uri: prop, 
                title: obj.title,
                date: obj.date,
                [dicSizePropName]: obj[dicSizePropName]
            };

            if (includeHtml)
                pageInfo[htmlPropName] = obj[htmlPropName];
            
            pagesInfo.push(pageInfo);
        });

        return {
            pageCategories: (await PageCategory.get()) || {},
            pagesInfo
        };
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

    static generateLoadingUrl(uri) {
        try {
            const uriObj = new URL(uri);
            uriObj.searchParams.set(this._LOADING_PARAM, true);

            return uriObj.toString();
        }
        catch (ex) {
            return uri;       
        }
    }

    static remove(pageUris = []) {
        return BrowserStorage.remove(pageUris);
    }

    static async savePages(pagesInfo) {
        const htmlPropName = this.HTML_PROP_NAME;
        const dicSizePropName = this.DIC_SIZE_PROP_NAME;

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
                [dicSizePropName]: pi[dicSizePropName],
                date: pi.date,
                title: pi.title
            });

            importedFiles.push(this._excludeHtml(pi));
        });

        const responses = await Promise.all([PageCategory.upsert(pageCategories),
            Category.upsert(pageCategories)]);
            
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
    
    static getAllSavedCategories() {
        return Category.get();
    }

    static saveCategories(data) {
        return Category.save(data);
    }

    static savePageCategories(data) {
        return PageCategory.save(data);
    }
}
