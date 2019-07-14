import { ColourList } from './colourList.js';

class RepeatInitError extends Error {
    constructor() {
        super('The page has already been initialised');
        
        this.name = RepeatInitError.MESSAGE;
    }

    static get MESSAGE() {
        return 'RepeatInitError';
    }
}

class PageTable {
    constructor(pagesInfo = []) {
        this._pagesInfo = pagesInfo;
        this._sortPagesInfo();

        this._removedPageUris = new Set();

        const formTableId = 'form--table-pages';
        this._tableBody = document.getElementById(formTableId).tBodies[0];

        if (this._isRendered())
            throw new RepeatInitError();

        this._CHECK_CLASS_NAME = formTableId + '--check';
        this._CHECKED_MODIFIER = ':checked';                

        this._CHECK_TICKED_SELECTOR = `.${this._CHECK_CLASS_NAME}${this._CHECKED_MODIFIER}`;
        
        this._checkAllBtn = document.getElementById(this._CHECK_CLASS_NAME + '-all');
        this._checkAllBtn.onclick = this._bindToThis(this._onCheckAllClick);

        this._TABLE_CELL_NAME = 'td';

        this._render();

        const pageSectionPrefix = 'form--section-page--';
        this._showPageBtn = document.getElementById(pageSectionPrefix + 'btn-show');
        this._showPageBtn.onclick = this._bindToThis(this._onShowPageBtnClick);

        this._removePageBtn = document.getElementById(pageSectionPrefix + 'btn-remove');
        this._removePageBtn.onclick = this._bindToThis(this._onRemovePageBtnClick);

        this._sortHeader = null;

        [...document.getElementsByClassName(formTableId + '--cell-header')].forEach(ch => {
            if (!this._sortHeader)
                this._sortHeader = ch;

            ch.onclick = this._bindToThis(this._onHeaderCellClick);
        });

        const hiddenClassName = formTableId + '--row-hidden';
        document.getElementById(pageSectionPrefix + 'txt-search').onchange = 
            this._bindToThis(this._onSearching, [hiddenClassName]);
    }

    _isRendered() {
        return this._tableBody.rows.length > 0;
    }

    _bindToThis(fn, args = []) {
        return fn.bind(this, ...args);
    }

    _render() {
        this._tableBody.append(...this._pagesInfo.map(this._bindToThis(this._renderPageInfoRow)));
    }

    _onCheckAllClick(_event) {
        const shouldCheck = _event.target.checked;
        const modifier = shouldCheck ? `:not(${this._CHECKED_MODIFIER})` : 
            this._CHECKED_MODIFIER;
        
        document.querySelectorAll('.' + this._CHECK_CLASS_NAME + modifier)
            .forEach(el => el.checked = shouldCheck);
    }

    _renderPageInfoRow(pageInfo) {
        const row = document.createElement('tr');

        const check = document.createElement('input');
        check.dataset.uri = pageInfo.uri;
        check.className = this._CHECK_CLASS_NAME;
        check.type = 'checkbox';
        check.onchange = this._bindToThis(this._onRowCheck);

        const checkCell = document.createElement(this._TABLE_CELL_NAME);
        checkCell.append(check);

        row.append(checkCell, this._createLabelCell(pageInfo.title, pageInfo.uri), 
            this._createLabelCell(this._formatDate(pageInfo.date)));
        return row;
    }

    _onRowCheck() {
        const checkedNumber = 
            document.querySelectorAll(this._CHECK_TICKED_SELECTOR).length;
        
        this._showPageBtn.disabled = checkedNumber !== 1;
        this._removePageBtn.disabled = checkedNumber === 0;

        this._checkAllBtn.checked = checkedNumber == this._pagesInfo.length;
    }

    _createLabelCell(text, title = null) {
        const label = document.createElement('label');

        if (title)
            text += ` <br><i class='form--table-pages--cell-title'>(${title})</i>`;

        label.innerHTML = text;

        const labelCell = document.createElement(this._TABLE_CELL_NAME);
        labelCell.append(label);

        return labelCell;
    }

    _formatDate(ticks) {
        const date = new Date(ticks);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }

    _onShowPageBtnClick() {
        const uri = this._getCheckboxUri(document.querySelector(this._CHECK_TICKED_SELECTOR));
        
        if (uri)
            window.open(window.PageInfo.generateLoadingUrl(uri), '_blank');
    }

    _getCheckboxUri(checkbox) {
        return checkbox.dataset.uri;
    }

    _onRemovePageBtnClick() {
        if (!this._pagesInfo.length)
            return;

        document.querySelectorAll(this._CHECK_TICKED_SELECTOR)
            .forEach(el => {
                this._removedPageUris.add(this._getCheckboxUri(el));

                el.parentElement.parentElement.remove();
            });

        this._pagesInfo = this._pagesInfo.filter(pi => !this._removedPageUris.has(pi.uri));        
    }

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
        
        this._sortPagesInfo(cell.dataset.sortField, shouldBeAscending);

        this._clearTableRows();
        this._render();
    }

    _sortPagesInfo(sortField = 'title', isAscending = true) {
        let sortFn = isAscending ? (a, b) => a[sortField] > b[sortField] : 
            (a, b) => b[sortField] > a[sortField];

        this._pagesInfo = this._pagesInfo.sort(sortFn);
    }

    _clearTableRows() {
        this._tableBody.innerHTML = '';
    }

    _onSearching(hiddenClassName, _event) {
        const searchText = (_event.target.value || '').toUpperCase();
        
        [...this._tableBody.rows].forEach(r => {
            if (searchText.length && r.innerText.toUpperCase().indexOf(searchText) === -1)
                r.classList.add(hiddenClassName);
            else
                r.classList.remove(hiddenClassName);
        });
    }

    get removedPageUris() {
        return [...this._removedPageUris];
    }
}

export class Preferences {
    constructor() {
        this._initColourList();
        
        this._pageTable = null;
        this._loadedPreferences = null;

        this._warningCheck = this._getCheckbox('warning');
        this._loadingCheck = this._getCheckbox('loading');

        this._storage = new window.BrowserStorage(Preferences.STORAGE_KEY);
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
        }), this._initPageTable()]);
    }
	
    static loadFromStorage() {
        return new window.BrowserStorage(Preferences.STORAGE_KEY).get();
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
            window.PageInfo.remove(this._pageTable.removedPageUris) : 
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

    _initPageTable() {
        return window.PageInfo.getAllSavedPagesInfo().then(pagesInfo =>
            this._pageTable = new PageTable(pagesInfo)
        );
    }
}
