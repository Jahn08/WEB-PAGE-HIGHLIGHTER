import { ColourList } from './colourList.js';
import { PageLocalisation } from './pageLocalisation.js';

class RepeatInitError extends Error {
    constructor() {
        super('The page has already been initialised');
        
        this.name = RepeatInitError.NAME;
    }

    static get NAME() {
        return 'RepeatInitError';
    }
}

class PagePackageError extends Error {
    constructor(type) {
        let msg;

        const locale = new BrowserAPI().locale;

        switch(type) {
        case PagePackageError.WRONG_INITIALISATION_TYPE:
            msg = locale.getString('package-init-error');
            break;
        case PagePackageError.EMPTY_IMPORT_PACKAGE_TYPE:
            msg = locale.getString('package-empty-info-error');
            break;
        default:
            msg = locale.getString('package-unknown-error');
            break;
        }

        super(msg);

        this.name = PagePackageError.NAME;
    }

    static get NAME() {
        return 'ExportError';
    }

    static get WRONG_INITIALISATION_TYPE() { return 1; }

    static get EMPTY_IMPORT_PACKAGE_TYPE() { return 2; }
}

class BaseTable {
    constructor(tableSectionName, tableData) {
        this._tableSectionId = 'form--section-' + tableSectionName;
        const tableId = this._tableSectionId + '--table';

        const table = document.getElementById(tableId);
        this._tableBody = table.tBodies[0];
        
        this._tableData = tableData;  

        if (this._isRendered())
            throw new RepeatInitError();

        this._sortTableData();
        
        this._checkClassName = tableId + '--check';
        this._CHECKED_MODIFIER = ':checked';

        this._checkTickedSelector = `.${this._checkClassName}${this._CHECKED_MODIFIER}`;
        
        this._checkAllBtn = document.getElementById(this._checkClassName + '-all');
        this._checkAllBtn.onchange = this.bindToThis(this._onCheckAllClick);

        this._TABLE_CELL_NAME = 'td';

        this._BTN_PREFIX = 'btn-';

        this._locale = new BrowserAPI().locale;

        this._HEADER_CELL_CLASS = 'form--table--cell-header';
        this._sortHeader = null;
        ArrayExtension.runForEach([...table.tHead.getElementsByClassName(this._HEADER_CELL_CLASS)], 
            ch => {
                if (!this._sortHeader)
                    this._sortHeader = ch;

                ch.onclick = this.bindToThis(this._onHeaderCellClick);
            });
            
        const hiddenClassName = 'form--table--row-hidden';
        this._searchField = document.getElementById(this._tableSectionId + '--txt-search');
        this._searchField.onchange = this.bindToThis(this._onSearching, [hiddenClassName]);

        document.addEventListener('keydown', this.bindToThis(this._stopEnterClickButForSearch, [hiddenClassName]));
        
        this._render();
    }

    _isRendered() {
        return this._tableBody.rows.length > 0;
    }
    
    _sortTableData() {
        const defaultSortField = 'title';
        const sortField = this._sortHeader ? (this._sortHeader.dataset.sortField || defaultSortField): defaultSortField;

        const items = this._tableData.map(i => {
            if (i[sortField] === undefined)
                i[sortField] = null;

            return i;
        });

        this._tableData = this._isSortDescending() ? 
            items.sort((a, b) => b[sortField] > a[sortField] ? 1 : (b[sortField] < a[sortField] ? -1: 0)):
            items.sort((a, b) => a[sortField] > b[sortField] ? 1 : (a[sortField] < b[sortField] ? -1: 0));
    }

    bindToThis(fn, args = []) {
        return fn.bind(this, ...args);
    }

    _onCheckAllClick(_event) {
        const shouldCheck = _event.target.checked;
        const modifier = shouldCheck ? `:not(${this._CHECKED_MODIFIER})` : 
            this._CHECKED_MODIFIER;
        
        document.querySelectorAll('.' + this._checkClassName + modifier)
            .forEach(el => { 
                if (el.checked === shouldCheck)
                    return;

                el.checked = shouldCheck;
            });

        this._updateButtonsAvailability();
    }

    _updateButtonsAvailability() { }

    _onHeaderCellClick(_event) {
        const cell = _event.target;

        const descSortClass = this._getDescSortClassName();
        const ascSortClass = this._HEADER_CELL_CLASS + '-asc';

        let shouldBeAscending;

        if (this._sortHeader !== cell) {
            const classList = this._sortHeader.classList;
            
            if (classList.contains(descSortClass))
                classList.remove(descSortClass);
            else
                classList.remove(ascSortClass);
            
            this._sortHeader = cell;

            cell.classList.add(ascSortClass);
            shouldBeAscending = true;
        }
        else {
            shouldBeAscending = this._isSortDescending();

            if (shouldBeAscending)
                cell.classList.replace(descSortClass, ascSortClass);
            else
                cell.classList.replace(ascSortClass, descSortClass);
        }
        
        this._sortTableData();

        this._clearTableRows();
        this._render();
    }

    _getDescSortClassName() {
        return this._HEADER_CELL_CLASS + '-desc';
    }

    _isSortDescending() {
        return this._sortHeader ? this._sortHeader.classList.contains(this._getDescSortClassName()): false;
    }

    _clearTableRows() {
        this._clearElement(this._tableBody);
    }

    _clearElement(elem) {
        if (elem.innerHTML)
            elem.innerHTML = '';
    }

    _render() { }

    _createLabelCell(text, title = null) {
        const label = document.createElement('label');

        if (title)
            text += ` <br><i class='form--table--cell-title'>(${title})</i>`;

        label.innerHTML = text;

        const labelCell = document.createElement(this._TABLE_CELL_NAME);
        labelCell.append(label);

        return labelCell;
    }

    _onSearching(hiddenClassName, _event) {
        const searchText = (_event.target.value || '').toUpperCase();

        ArrayExtension.runForEach([...this._tableBody.rows], 
            r => {
                if (searchText.length && (r.innerText || r.textContent).toUpperCase().indexOf(searchText) === -1)
                    r.classList.add(hiddenClassName);
                else
                    r.classList.remove(hiddenClassName);
            });
    }

    _stopEnterClickButForSearch(hiddenClassName, event) {
        if (event.key !== 'Enter')
            return true;

        if (event.target === this._searchField)
            this._onSearching(hiddenClassName, event);

        event.preventDefault();
        return false;
    }

    _getControlByName(ctrlName) {
        return document.getElementById(this._getControlFullName(ctrlName));       
    }
    
    _getControlFullName(ctrlName) {
        return `${this._tableSectionId}--${ctrlName}`;
    }

    _getControlsByName(ctrlName) {
        return document.getElementsByClassName(this._getControlFullName(ctrlName));       
    }

    _removeRows() {
        const removedKeys = [];

        document.querySelectorAll(this._checkTickedSelector).forEach(el => {
            removedKeys.push(this._getRowKey(el));

            el.parentElement.parentElement.remove();
        });

        return removedKeys;
    }

    _getRowKey() { }
}

class CategoryTable extends BaseTable {
    constructor(categories = []) {
        super('category', categories);

        this._removeBtn = this._getControlByName(this._BTN_PREFIX + 'remove');
        this._removeBtn.onclick = this.bindToThis(this._removeCategory);

        this._addBtn = this._getControlByName(this._BTN_PREFIX + 'add');
        this._addBtn.onclick = this.bindToThis(this._addCategory);

        this._makeDefaultBtn = this._getControlByName(this._BTN_PREFIX + 'default');
        this._makeDefaultBtn.onclick = this.bindToThis(this._makeCategoryDefault);

        this._defaultCategoryTitle = null;

        this._isDirty = false;

        this.onRemoved = null;
        this.onAdded = null;
    }

    _makeDirty() { this._isDirty = true; }

    get _DEFAULT_CATEGORY_CLASS_NAME() { return 'form--table-category--row-default'; }

    _removeCategory() {
        if (!this._tableData.length)
            return;

        const _removedCatTitles = this._removeRows();

        this._tableData = this._tableData.filter(pi => 
            !ArrayExtension.contains(_removedCatTitles, pi.title));
            
        this._makeDefaultBtn.disabled = true;
        this._removeBtn.disabled = true;

        this._makeDirty();

        this._emitEvent(this.onRemoved, _removedCatTitles);
    }

    _getRowKey(el) { return el.dataset.title; }

    _emitEvent(callback, arg) {
        if (!callback)
            return;

        callback(arg);
    }

    _addCategory() {
        const name = prompt(this._locale.getString('preferences-new-category-prompt'));

        if (!name)
            return;

        if (this._tableData.find(i => i.title === name)) {
            alert(this._locale.getStringWithArgs('preferences-duplicated-category-warning', name));
            return;
        }

        const newCategory = { title: name };
        this._tableData.push(newCategory);

        this._sortTableData();

        this._clearTableRows();
        this._render();

        this._makeDirty();

        this._emitEvent(this.onAdded, name);
    }

    _makeCategoryDefault() {
        if (!this._tableData.length)
            return;

        const markedCheckBox = document.querySelector(this._checkTickedSelector);
        
        if (!markedCheckBox)
            return;

        const rowClassList = markedCheckBox.parentElement.parentElement.classList;

        const defaultCategoryClassName = this._DEFAULT_CATEGORY_CLASS_NAME;
        const shouldGetDefault = !rowClassList.contains(defaultCategoryClassName);

        ArrayExtension.runForEach(document.getElementsByClassName(defaultCategoryClassName), 
            r => r.classList.remove(defaultCategoryClassName));

        ArrayExtension.runForEach(this._tableData.filter(c => c.default), 
            c => c.default = false);

        if (shouldGetDefault) {
            rowClassList.add(defaultCategoryClassName);

            this._defaultCategoryTitle = markedCheckBox.dataset.title;
            this._tableData.find(c => c.title === this._defaultCategoryTitle).default = true;
        }
        else
            this._defaultCategoryTitle = null;
        
        this._makeDirty();
    }

    _render() {
        const renderingRowFn = this.bindToThis(this._renderCategoryInfoRow);
        this._tableBody.append(...this._tableData.map(renderingRowFn));
    }

    _renderCategoryInfoRow(categoryInfo) {
        const row = document.createElement('tr');

        const check = document.createElement('input');
        check.dataset.title = categoryInfo.title;
        check.className = this._checkClassName;
        check.type = 'checkbox';
        check.onchange = this.bindToThis(this._updateButtonsAvailability);

        const checkCell = document.createElement(this._TABLE_CELL_NAME);
        checkCell.append(check);

        if (categoryInfo.default && !this._defaultCategoryTitle) {
            this._defaultCategoryTitle = categoryInfo.title;
            row.classList.add(this._DEFAULT_CATEGORY_CLASS_NAME);
        }

        row.append(checkCell, this._createLabelCell(categoryInfo.title), 
            this._createLabelCell(''));
        return row;
    }

    _updateButtonsAvailability(isFromRowCheckedEvent = false) {
        const checkedNumber = 
            document.querySelectorAll(this._checkTickedSelector).length;
        
        this._makeDefaultBtn.disabled = checkedNumber !== 1;
        this._removeBtn.disabled = checkedNumber === 0;

        if (isFromRowCheckedEvent)
            this._checkAllBtn.checked = checkedNumber === this._tableData.length;
    }
    
    get categories() {
        return this._isDirty ? this._tableData: null;
    }

    _clearTableRows() {
        this._defaultCategoryTitle = null;
        
        super._clearTableRows();
    }
}

class PageTable extends BaseTable {
    constructor(pagesInfo = [], pageCategories = [], defaultCategory = null) {
        super('page', pagesInfo);

        this._removedPageUris = [];

        this._showPageBtn = this._getControlByName(this._BTN_PREFIX + 'show');
        this._showPageBtn.onclick = this.bindToThis(this._onShowPageBtnClick);

        this._removePageBtn = this._getControlByName(this._BTN_PREFIX + 'remove');
        this._removePageBtn.onclick = this.bindToThis(this._onRemovePageBtnClick);

        this._exportPageLink = null;
        this._exportPageBtn =  this._getControlByName(this._BTN_PREFIX + 'export');
        this._exportPageBtn.onclick = this.bindToThis(this._onExportPageBtnClick);

        this._filePageBtn =  this._getControlByName(this._BTN_PREFIX + 'file');
        this._filePageBtn.onchange = this.bindToThis(this._onChoosePackageFileBtnClick);

        this._importPageBtns = [...this._getControlsByName(this._BTN_PREFIX + 'import')];
        ArrayExtension.runForEach(this._importPageBtns, 
            btn => btn.onclick = this.bindToThis(this._onImportPageBtnClick));
        this._importIsUpsertable = false;

        this._updateImportBtnsAvailability(true);
        
        this._statusLabel = null;

        this._PAGES_ARCHIVE_EXTENSION = '.hltr';
        this._pagesArchive = null;

        this._pageCategoryChanged = false;
        this._pageCategories = pageCategories;

        this._defaultCategory = defaultCategory;
        this._categoryFilter = this._getControlByName('filter-category');
        this._categoryFilter.onchange = this.bindToThis(this._showCategoryPages);

        this._categorySelector = this._getControlByName('select-category');

        this._moveToCategoryBtn =  this._getControlByName(this._BTN_PREFIX + 'move');
        this._moveToCategoryBtn.onclick = this.bindToThis(this._movePagesToCategory);

        this._renderCategoryControls();
    }

    addPageCategory(categoryTitle) {
        this._pageCategories.push({ category: categoryTitle, pages: [] });

        this._renderCategoryControls();
    }

    removePageCategories(categoryTitles = []) {
        this._pageCategories = this._pageCategories
            .filter(c => !categoryTitles.includes(c.category));

        this._renderCategoryControls();
    }

    _showCategoryPages() {
        // TODO: RENDER CATEGORY PAGES HERE

        this._clearElement(this._categorySelector);
        this._appendOptionsToCategorySelector(
            this._createCategoryOptions(this._categoryFilter.value));
    }

    _appendOptionsToCategorySelector(options = []) {
        this._categorySelector.append(...options.filter(c => !c.selected));
    }

    _movePagesToCategory() {
        //const movedPageUris = this._removeRows();

        // TODO: RERENDER THE CURRENT PAGE LIST
    }

    _renderCategoryControls() {
        const selectedValue = this._categoryFilter.value || this._defaultCategory;

        this._clearElement(this._categoryFilter);
        this._clearElement(this._categorySelector);
    
        this._categoryFilter.append(...this._createCategoryOptions(selectedValue));
        this._appendOptionsToCategorySelector(this._createCategoryOptions(selectedValue));
    }

    _createCategoryOptions(selectedCategory) {
        const catNameField = 'category';
        
        let hasSelectedValue;
        const options = ArrayExtension.sortAsc(this._pageCategories, catNameField).map(pc => {
            const catName = pc[catNameField];
            const selected = catName === selectedCategory;
            
            if (selected)
                hasSelectedValue = true;

            return this._createSelectOption(catName, selected);
        });
        options.unshift(this._createSelectOption('None', !hasSelectedValue));

        return options;
    }

    _createSelectOption(value, selected = false) {
        const option = document.createElement('option');
        option.innerText = value;
        option.selected = selected;

        return option;
    }

    get pageCategories() {
        return this._pageCategoryChanged ? this._pageCategories: null;
    }

    _render() {
        const renderingRowFn = this.bindToThis(this._renderPageInfoRow);
        this._tableBody.append(...this._tableData.map(renderingRowFn));
    }

    _renderPageInfoRow(pageInfo) {
        const row = document.createElement('tr');

        const check = document.createElement('input');
        check.dataset.uri = pageInfo.uri;
        check.className = this._checkClassName;
        check.type = 'checkbox';
        check.onchange = this.bindToThis(this._updateButtonsAvailability);

        const checkCell = document.createElement(this._TABLE_CELL_NAME);
        checkCell.append(check);

        row.append(checkCell, this._createLabelCell(pageInfo.title, pageInfo.uri), 
            this._createLabelCell(this._formatDate(pageInfo.date)));
        return row;
    }

    _updateButtonsAvailability(isFromRowCheckedEvent = false) {
        const checkedNumber = 
            document.querySelectorAll(this._checkTickedSelector).length;
        
        this._showPageBtn.disabled = checkedNumber !== 1;

        const noneChecked = checkedNumber === 0;
        this._removePageBtn.disabled = noneChecked;
        this._moveToCategoryBtn.disabled = noneChecked;

        if (isFromRowCheckedEvent)
            this._checkAllBtn.checked = checkedNumber === this._tableData.length;
    }

    _formatDate(ticks) {
        const date = new Date(ticks);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }

    _onShowPageBtnClick() {
        const uri = this._getRowKey(document.querySelector(this._checkTickedSelector));
        
        if (uri)
            window.open(PageInfo.generateLoadingUrl(uri), '_blank');
    }

    _getRowKey(checkbox) { return checkbox.dataset.uri; }

    _onRemovePageBtnClick() {
        if (!this._tableData.length)
            return;

        const removedPageUris = this._removeRows();
        this._removedPageUris.push(...removedPageUris);

        this._tableData = this._tableData.filter(pi => 
            !ArrayExtension.contains(this._removedPageUris, pi.uri));
            
        this._showPageBtn.disabled = true;
        this._removePageBtn.disabled = true;

        if (!this._tableData.length) {
            this._updateImportBtnsAvailability(true);
            this._exportPageBtn.disabled = true;
        }
    }

    _onChoosePackageFileBtnClick() {
        const importPackage = this._filePageBtn.files[0];

        if (!importPackage || !importPackage.size)
            return;
        
        if (!importPackage.name.toLowerCase().endsWith(this._PAGES_ARCHIVE_EXTENSION)) {
            this._showStatus(this._locale.getString('import-wrong-format-error'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                this._updateImportBtnsAvailability(false);

                const result = event.target.result;

                let pagesToImport;

                if (!result || !(pagesToImport = JSON.parse(result)) || !pagesToImport.length)
                    throw new PagePackageError(PagePackageError.EMPTY_IMPORT_PACKAGE_TYPE);

                if (this._tableData.length)
                {
                    if (this._importIsUpsertable)
                        this._tableData = this._tableData.filter(imp => 
                            !pagesToImport.find(pi => pi.uri === imp.uri));
                    else
                        pagesToImport = pagesToImport.filter(imp => 
                            !this._tableData.find(pi => pi.uri === imp.uri));
                }
                
                const importedPages = PageInfo.savePages(pagesToImport);
                this._tableData = this._tableData.concat(importedPages);

                const presentPageUris = this._tableData.map(p => p.uri);
                this._removedPageUris = this._removedPageUris.filter(
                    removedUri => !presentPageUris.includes(removedUri));

                this._sortTableData();

                this._clearTableRows();
                this._render();

                if (importedPages.length)
                    this.initialiseExport();

                this._showStatus(
                    this._locale.getStringWithArgs('import-inserted-page-count', importedPages.length),
                    false);
            }
            catch (err) {
                this._showStatus(this._locale.getStringWithArgs('import-error', err.toString()));
            }
            finally {
                this._importIsUpsertable = false;
                this._updateImportBtnsAvailability(true);
                this._filePageBtn.value = null;
            }
        };

        reader.readAsText(new Blob([importPackage]));
    }

    _showStatus(text, isWarning = true) {
        const statusSectionId = 'form-section-status';

        if (!this._statusLabel)
            this._statusLabel = document.getElementById(statusSectionId);        

        const labelEl = document.createElement('label');
        labelEl.innerText = text;

        const statusLabelClass = statusSectionId + '--label';
        labelEl.className = statusLabelClass;

        if (isWarning)
            labelEl.classList.add(statusLabelClass + '-warning');
            
        this._statusLabel.append(labelEl);
    }

    _updateImportBtnsAvailability(isAvailable) {
        ArrayExtension.runForEach(this._importPageBtns, 
            btn => { 
                if (isAvailable)
                    isAvailable = !this._isUpsertableBtn(btn) || this._tableData.length > 0;

                btn.disabled = !isAvailable;
            });
    }

    _isUpsertableBtn(btn) {
        return btn.dataset.upsertable === 'true';
    }

    _onImportPageBtnClick(_event) {
        this._importIsUpsertable = this._isUpsertableBtn(_event.target);

        this._hideStatus();

        this._filePageBtn.click();
    }

    _hideStatus() {
        if (this._statusLabel && this._statusLabel.innerHTML)
            this._statusLabel.innerHTML = null;
    }

    _onExportPageBtnClick() {
        if (!this._tableData.length)
            return;

        if (!this._exportPageLink) {
            this._exportPageLink =  this._getControlByName('link-export');
            this._exportPageLink.download = 'highlighterStorage' + this._PAGES_ARCHIVE_EXTENSION;
        }

        this._useArchiveLink(url => {
            this._exportPageLink.href = url;
            this._exportPageLink.click();
        });
    }

    _useArchiveLink(callback) {
        let archiveUrl;

        try {
            callback(archiveUrl = URL.createObjectURL(this._pagesArchive));
        }
        finally {
            if (archiveUrl)
                URL.revokeObjectURL(archiveUrl);
        }
    }

    get removedPageUris() {
        return this._removedPageUris;
    }

    initialiseExport() {
        return PageInfo.getAllSavedPagesFullInfo().then(pagesFullInfo =>  {
            if (!pagesFullInfo.length) {
                this._exportPageBtn.disabled = true;
                return Promise.resolve();
            }

            return this._generatePagesArchive(pagesFullInfo).then(data => {
                this._pagesArchive = data;
                this._exportPageBtn.disabled = false;
            }).catch(err => 
                this._showStatus(this._locale.getStringWithArgs('export-error', err.toString())));
        });
    }

    _generatePagesArchive(pagesInfo) {
        return new Promise((resolve, reject) => {
            try {
                const archive = new Blob([JSON.stringify(pagesInfo)]);
                resolve(archive);
            }
            catch(err) {
                reject(err);
            }
        });
    }
}

class Preferences {
    constructor() {
        this._initColourList();

        this._pageTable = null;
        this._defaultCategory = null;

        this._categoryTable = null;

        this._loadedPreferences = null;

        this._warningCheck = this._getCheckbox('warning');
        this._loadingCheck = this._getCheckbox('loading');

        this._storage = new BrowserStorage(Preferences.STORAGE_KEY);

        PageLocalisation.setLocaleStrings(new BrowserAPI().locale);
    }
	
    static get STORAGE_KEY() {
        return 'preferences';
    }

    _initColourList() {
        const colourListEl = document.getElementById('form--section-colours');
        
        if (colourListEl.childElementCount)
            throw new RepeatInitError();

        colourListEl.append(...ColourList.colours.map((c, index) => {
            const groupEl = document.createElement('div');

            const radio = document.createElement('input');
            radio.name = this._COLOUR_RADIO_NAME;
            radio.type = 'radio';
            radio.value = c.token;
            radio.checked = index === 0;

            const image = document.createElement('img');
            image.src = '../' + c.icon.relativeFilePath;

            const label = document.createElement('label');
            label.className = PageLocalisation.LOCALE_CLASS_NAME;
            label.name = c.token;
            label.innerHTML = c.title;

            groupEl.append(radio, image, label);

            return groupEl;
        }));
    }

    _getCheckbox(idPostfix) {
        return document.getElementById('form--check-' + idPostfix);
    }

    load() {
        return Promise.all([Preferences.loadFromStorage().then(loadedForm => {
            this._loadedPreferences = loadedForm;

            if (loadedForm) {
                this._shouldWarn = loadedForm.shouldWarn;
                this._shouldLoad = loadedForm.shouldLoad;
                this._defaultColourToken = loadedForm.defaultColourToken;
            }
        }), this._initCategoryTable().then(() => this._initPageTable())]);
    }
	
    static loadFromStorage() {
        return new BrowserStorage(Preferences.STORAGE_KEY).get();
    }

    _initPageTable() {
        return PageInfo.getAllSavedPagesInfo().then(info => {
            this._pageTable = new PageTable(info.pagesInfo,
                [{ category: 'Science', pages: [] }, { category: 'Financies', pages: [] }],
                // info.pageCategories, 
                this._defaultCategory);

            if (this._categoryTable) {
                this._categoryTable.onAdded = 
                    this._pageTable.bindToThis(this._pageTable.addPageCategory);
                this._categoryTable.onRemoved = 
                    this._pageTable.bindToThis(this._pageTable.removePageCategories);
            }
        });
    }

    _initCategoryTable() {
        return PageInfo.getAllSavedCategories().then(categories => {
            this._categoryTable = new CategoryTable(categories);

            if (categories)
                this._defaultCategory = categories.find(c => c.default);
        });
    }

    initialiseExport() {
        if (!this._pageTable)
            return Promise.reject(new PagePackageError(PagePackageError.WRONG_INITIALISATION_TYPE));
    
        return this._pageTable.initialiseExport();
    }

    save() {
        return Promise.all([this._savePreferencesIntoStorage(),
            this._removePageInfoFromStorage(), this._updatePageCategories(),
            this._updateCategoriesInStorage()]);
    }
    
    _savePreferencesIntoStorage() {
        return this._preferencesHaveChanged() ? this._storage.set({
            shouldWarn: this._shouldWarn,
            shouldLoad: this._shouldLoad,
            defaultColourToken: this._defaultColourToken
        }) : Promise.resolve();
    }

    _preferencesHaveChanged() {
        const pureValues = this._loadedPreferences;

        return !pureValues || pureValues.shouldWarn !== this._shouldWarn || 
            pureValues.shouldLoad !== this._shouldLoad || 
            pureValues.defaultColourToken !== this._defaultColourToken;
    }

    _removePageInfoFromStorage() {
        return this._pageTable && this._pageTable.removedPageUris.length ? 
            PageInfo.remove(this._pageTable.removedPageUris) : 
            Promise.resolve();
    }

    _updatePageCategories() {
        let changedData;

        return this._pageTable && (changedData = this._pageTable.pageCategories) ? 
            PageInfo.savePageCategories(changedData) : Promise.resolve();
    }

    _updateCategoriesInStorage() {
        let changedData;

        return this._categoryTable && (changedData = this._categoryTable.categories) ? 
            PageInfo.saveCategories(changedData) : Promise.resolve();
    }

    get _shouldWarn() {
        return this._warningCheck.checked;
    }

    set _shouldWarn(value) {
        this._warningCheck.checked = value;
    }
    
    get _shouldLoad() {
        return this._loadingCheck.checked;
    }

    set _shouldLoad(value) {
        this._loadingCheck.checked = value;
    }
    
    get _defaultColourToken() {
        return document.querySelector(
            `[name='${this._COLOUR_RADIO_NAME}']:checked`).value;
    }

    get _COLOUR_RADIO_NAME () {
        return 'form--section-colours--radio';
    }

    set _defaultColourToken(colourToken) {
        const colourRadio = document.querySelector(`input[value='${colourToken}']`);
		
        if (colourRadio)
            colourRadio.checked = true;
    }
}

export { RepeatInitError, PagePackageError, Preferences };