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
        this._checkAllBtn.onchange = this._bindToThis(this._onCheckAllClick);

        this._TABLE_CELL_NAME = 'td';

        this._BTN_PREFIX = 'btn-';

        this._locale = new BrowserAPI().locale;

        this._sortHeader = null;
        ArrayExtension.runForEach([...table.tHead.getElementsByClassName('form--table--cell-header')], 
            ch => {
                if (!this._sortHeader)
                    this._sortHeader = ch;

                ch.onclick = this._bindToThis(this._onHeaderCellClick);
            });
            
        const hiddenClassName = 'form--table--row-hidden';
        this.searchField = document.getElementById(this._tableSectionId + '--txt-search');
        this.searchField.onchange = this._bindToThis(this._onSearching, [hiddenClassName]);

        document.onkeydown = this._bindToThis(this._stopEnterClickButForSearch, [hiddenClassName]);
        
        this._render();
    }

    _isRendered() {
        return this._tableBody.rows.length > 0;
    }
    
    _sortTableData(sortField = 'title', isAscending = true) {
        this._tableData = isAscending ? 
            this._tableData.sort((a, b) => a[sortField] > b[sortField] ? 1 : (a[sortField] < b[sortField] ? -1: 0)) : 
            this._tableData.sort((a, b) => b[sortField] > a[sortField] ? 1 : (b[sortField] < a[sortField] ? -1: 0));
    }

    _bindToThis(fn, args = []) {
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

        this._updatePageButtonsAvailability();
    }

    _updatePageButtonsAvailability() { }

    _onHeaderCellClick(_event) {
        const cell = _event.target;

        const headerCellClass = cell.classList[0];
        const descSortClass = headerCellClass + '-desc';
        const ascSortClass = headerCellClass + '-asc';

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
            shouldBeAscending = cell.classList.contains(descSortClass);

            if (shouldBeAscending)
                cell.classList.replace(descSortClass, ascSortClass);
            else
                cell.classList.replace(ascSortClass, descSortClass);
        }
        
        this._sortTableData(cell.dataset.sortField, shouldBeAscending);

        this._clearTableRows();
        this._render();
    }

    _clearTableRows() {
        this._tableBody.innerHTML = '';
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

        if (event.target === this.searchField)
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
}

class CategoryTable extends BaseTable {
    constructor(categories = []) {
        super('category', categories);

        this._removedCategories = [];

        this._removeBtn = this._getControlByName(this._BTN_PREFIX + 'remove');
        this._removeBtn.onclick = this._bindToThis(this._removeCategory);

        // this._addBtn = this._getControlByName(this._BTN_PREFIX + 'add');
        // this._addBtn.onclick = this._bindToThis(this._addCategory);

        // this._makeDefaultBtn = this._getControlByName(this._BTN_PREFIX + 'default');
        // this._makeDefaultBtn.onclick = this._bindToThis(this._makeCategoryDefault);
    }

    _removeCategory() {
        if (!this._tableData.length)
            return;

        document.querySelectorAll(this._checkTickedSelector)
            .forEach(el => {
                this._removedCategories.push(el.dataset.title);

                el.parentElement.parentElement.remove();
            });

        this._tableData = this._tableData.filter(pi => 
            !ArrayExtension.contains(this._removedCategories, pi.title));
            
        //this._makeDefaultBtn.disabled = true;
        this._removeBtn.disabled = true;
    }

    _render() {
        const renderingRowFn = this._bindToThis(this._renderCategoryInfoRow);
        this._tableBody.append(...this._tableData.map(renderingRowFn));
    }

    _renderCategoryInfoRow(categoryInfo) {
        const row = document.createElement('tr');

        const check = document.createElement('input');
        check.dataset.title = categoryInfo.title;
        check.className = this._checkClassName;
        check.type = 'checkbox';
        check.onchange = this._bindToThis(this._updateCategoryButtonsAvailability);

        const checkCell = document.createElement(this._TABLE_CELL_NAME);
        checkCell.append(check);

        row.append(checkCell, this._createLabelCell(categoryInfo.title));
        return row;
    }

    _updateCategoryButtonsAvailability(isFromRowCheckedEvent = false) {
        const checkedNumber = 
            document.querySelectorAll(this._checkTickedSelector).length;
        
        //this._makeDefaultBtn.disabled = checkedNumber !== 1;
        this._removeBtn.disabled = checkedNumber === 0;

        if (isFromRowCheckedEvent)
            this._checkAllBtn.checked = checkedNumber === this._tableData.length;
    }
    
    get removedCategoryTitles() {
        return this._removedCategories;
    }
}

class PageTable extends BaseTable {
    constructor(pagesInfo = []) {
        super('page', pagesInfo);

        this._removedPageUris = [];

        this._showPageBtn = this._getControlByName(this._BTN_PREFIX + 'show');
        this._showPageBtn.onclick = this._bindToThis(this._onShowPageBtnClick);

        this._removePageBtn = this._getControlByName(this._BTN_PREFIX + 'remove');
        this._removePageBtn.onclick = this._bindToThis(this._onRemovePageBtnClick);

        this._exportPageLink = null;
        this._exportPageBtn =  this._getControlByName(this._BTN_PREFIX + 'export');
        this._exportPageBtn.onclick = this._bindToThis(this._onExportPageBtnClick);

        this._filePageBtn =  this._getControlByName(this._BTN_PREFIX + 'file');
        this._filePageBtn.onchange = this._bindToThis(this._onChoosePackageFileBtnClick);

        this._importPageBtns = [...this._getControlsByName(this._BTN_PREFIX + 'import')];
        ArrayExtension.runForEach(this._importPageBtns, 
            btn => btn.onclick = this._bindToThis(this._onImportPageBtnClick));
        this._importIsUpsertable = false;

        this._updateImportBtnsAvailability(true);
        
        this._statusLabel = null;

        this._PAGES_ARCHIVE_EXTENSION = '.hltr';
        this._pagesArchive = null;
    }

    _render() {
        const renderingRowFn = this._bindToThis(this._renderPageInfoRow);
        this._tableBody.append(...this._tableData.map(renderingRowFn));
    }

    _renderPageInfoRow(pageInfo) {
        const row = document.createElement('tr');

        const check = document.createElement('input');
        check.dataset.uri = pageInfo.uri;
        check.className = this._checkClassName;
        check.type = 'checkbox';
        check.onchange = this._bindToThis(this._updatePageButtonsAvailability);

        const checkCell = document.createElement(this._TABLE_CELL_NAME);
        checkCell.append(check);

        row.append(checkCell, this._createLabelCell(pageInfo.title, pageInfo.uri), 
            this._createLabelCell(this._formatDate(pageInfo.date)));
        return row;
    }

    _updatePageButtonsAvailability(isFromRowCheckedEvent = false) {
        const checkedNumber = 
            document.querySelectorAll(this._checkTickedSelector).length;
        
        this._showPageBtn.disabled = checkedNumber !== 1;
        this._removePageBtn.disabled = checkedNumber === 0;

        if (isFromRowCheckedEvent)
            this._checkAllBtn.checked = checkedNumber === this._tableData.length;
    }

    _formatDate(ticks) {
        const date = new Date(ticks);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }

    _onShowPageBtnClick() {
        const uri = this._getCheckboxUri(document.querySelector(this._checkTickedSelector));
        
        if (uri)
            window.open(PageInfo.generateLoadingUrl(uri), '_blank');
    }

    _getCheckboxUri(checkbox) {
        return checkbox.dataset.uri;
    }

    _onRemovePageBtnClick() {
        if (!this._tableData.length)
            return;

        document.querySelectorAll(this._checkTickedSelector)
            .forEach(el => {
                this._removedPageUris.push(this._getCheckboxUri(el));

                el.parentElement.parentElement.remove();
            });

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
        }), this._initPageTable(), this._initCategoryTable()]);
    }
	
    static loadFromStorage() {
        return new BrowserStorage(Preferences.STORAGE_KEY).get();
    }

    _initPageTable() {
        return PageInfo.getAllSavedPagesInfo().then(pagesInfo =>
            this._pageTable = new PageTable(pagesInfo)
        );
    }

    _initCategoryTable() {
        return new Promise((resolve) => {
            this._categoryTable = new CategoryTable([{ title: 'Financies' }, { title: 'Science' }]);

            resolve();
        });
    }

    initialiseExport() {
        if (!this._pageTable)
            return Promise.reject(new PagePackageError(PagePackageError.WRONG_INITIALISATION_TYPE));
    
        return this._pageTable.initialiseExport();
    }

    save() {
        return Promise.all([this._savePreferencesIntoStorage(),
            this._removePageInfoFromStorage()]);
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