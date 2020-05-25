import { ColourList } from './colourList.js';
import { PageLocalisation } from './pageLocalisation.js';

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

class Control {
    constructor(sectionName) {
        this._sectionId = 'form--section-' + sectionName;

        this._isDirty = false; 

        this._locale = new BrowserAPI().locale;
    }

    _getControlByName(ctrlName) {
        return document.getElementById(this._getControlFullName(ctrlName));       
    }
    
    _getControlFullName(ctrlName) {
        return `${this._sectionId}--${ctrlName}`;
    }

    _getControlsByName(ctrlName) {
        return document.getElementsByClassName(this._getControlFullName(ctrlName));       
    }
    
    _makeDirty() { 
        this._isDirty = true; 
    }

    bindToThis(fn, args = []) {
        return fn.bind(this, ...args);
    }

    _render() { }

    _getSelectedOption(selectCtrl) {
        const value = selectCtrl.value;
        
        if (value)
            return value;

        const selectedOption = selectCtrl.selectedOptions.item(0);
        return selectedOption ? selectedOption.value || selectedOption.innerText : null;
    }
    
    _showStatus(text, isWarning = true) {
        const statusSectionId = this._sectionId + '--status';

        if (!this._statusLabel)
            this._statusLabel = document.getElementById(statusSectionId);        

        const labelEl = document.createElement('label');
        labelEl.innerText = text;

        const statusLabelClass = 'form-section-status--label';
        labelEl.className = statusLabelClass;

        if (isWarning)
            labelEl.classList.add(statusLabelClass + '-warning');
            
        this._statusLabel.append(labelEl);
    }

    _hideStatus() {
        if (this._statusLabel && this._statusLabel.innerHTML)
            this._statusLabel.innerHTML = null;
    }
}


class ShortcutSelector extends Control {
    constructor() { 
        super('shortcuts');

        this._selector = document.getElementById(this._getControlFullName('select'));
        this._selector.onchange = this.bindToThis(this._updateShortcutStatus);

        this._shortcuts = {};

        this._keyTempCombination = [];
        this._shortcut = {};

        this._input = document.getElementById(this._getControlFullName('txt-input'));
        this._input.onkeydown = this.bindToThis(this._registerKeyCombination);
        this._input.onkeyup = this.bindToThis(this._registerKeyCombination);

        this._applyBtn = document.getElementById(this._getControlFullName('btn-apply'));
        this._applyBtn.onclick = this.bindToThis(this._applyKeyCombination);

        this._clearBtn = document.getElementById(this._getControlFullName('btn-clear'));
        this._clearBtn.onclick = this.bindToThis(this._clearKeyCombination);

        this._render();
    }

    setShortcuts(shortcuts) {
        this._shortcuts = Object.assign({}, shortcuts);
    
        this._updateShortcutStatus();
    }

    _registerKeyCombination(event) {
        if (event.type === 'keydown') {
            const unifiedKey = Shortcut.extractKeyInfo(event);

            if (!unifiedKey) {
                this._keyTempCombination.length = 0;
                return false;
            }

            this._keyTempCombination.push(unifiedKey);
        }
        else {
            const shortcut = new Shortcut(this._keyTempCombination);

            if (shortcut.key) {
                this._hideStatus();

                this._input.value = shortcut.key;
                this._shortcut = shortcut;

                const selectedCommandId = this._getSelectedOption(this._selector);
                const commandId = shortcut.getCommandsInUse(this._shortcuts)
                    .find(c => c !== selectedCommandId);
                if (commandId)
                    this._showStatus(this._locale.getStringWithArgs(
                        'preferences-duplicated-shortcut-warning', shortcut.key, 
                        this._locale.getString(commandId)));

                this._updateButtonsAvailability();
            }

            this._keyTempCombination = [];
        }

        return false;
    }

    _applyKeyCombination() {
        const selectedCommandId = this._getSelectedOption(this._selector);       

        if (!selectedCommandId) {
            this._showStatus(this._locale.getString('preferences-empty-shortcut-warning'));
            return;
        }

        if (this._shortcut) {
            const commandId = Shortcut.getCommandsInUse(this._shortcuts, this._shortcut.key)
                .find(c => c !== selectedCommandId);

            if (commandId) {
                if (!confirm(this._locale.getStringWithArgs(
                    'preferences-duplicated-shortcut-confirmation', this._shortcut.key, 
                    this._locale.getString(commandId))))
                    return;

                this._shortcuts[commandId] = null;
            }
        }

        this._hideStatus();

        this._shortcuts[selectedCommandId] = this._shortcut;
        this._updateButtonsAvailability();
        
        this._shortcut = null;
    }

    _updateButtonsAvailability() {
        this._clearBtn.disabled = !this._input.value;

        const selectedValue = this._getSelectedOption(this._selector);  
        
        const storedShortcutKey = (this._shortcuts[selectedValue] || {}).key;
        const shortcutKey = (this._shortcut || {}).key;
        const isShortcutSame = storedShortcutKey === shortcutKey;

        this._applyBtn.disabled = isShortcutSame;
        if (!isShortcutSame)
            this._showStatus(this._locale.getString('preferences-applying-shortcut-info'), false);
    }

    _clearKeyCombination() {
        this._hideStatus();

        this._input.value = null;
        this._shortcut = null;

        this._updateButtonsAvailability();
    }

    _updateShortcutStatus() {
        this._shortcut = this._shortcuts[this._getSelectedOption(this._selector)];
        this._input.value = (this._shortcut || {}).key || null;

        this._keyTempCombination = [];

        this._hideStatus();
        this._updateButtonsAvailability();
    }

    _render() {
        const optionGroups = [];
        
        const markingOptions = OptionList.marking;
        optionGroups.push(this._createOptionGroup('marking', markingOptions.mark, 
            markingOptions.unmark));

        const noteOptions = OptionList.noting;
        optionGroups.push(this._createOptionGroup('notes', noteOptions.add, 
            noteOptions.remove));
            
        const storageOptions = OptionList.storage;
        optionGroups.push(this._createOptionGroup('storage', storageOptions.save, 
            storageOptions.load));

        this._selector.append(...optionGroups);
    
        this._updateButtonsAvailability();
    }

    _createOptionGroup(groupToken, ...optionIds) {
        const group = PageLocalisation.prepareLabelLocale(document.createElement('optgroup'), 
            'preferences-shortcuts-group-' + groupToken);

        group.append(...optionIds.map(id => {
            const option = document.createElement('option');
            option.value = id;

            return PageLocalisation.prepareElemLocale(option, id);
        }));
        
        return group;
    }

    get shortcuts() {
        return this._shortcuts;
    }
}

class BaseTable extends Control {
    constructor(tableSectionName, tableData) {
        super(tableSectionName);

        const tableId = this._sectionId + '--table';

        const table = document.getElementById(tableId);
        this._tableBody = table.tBodies[0];
        
        this._tableData = tableData;

        this._sortTableData();
        
        this._checkClassName = tableId + '--check';
        this._CHECKED_MODIFIER = ':checked';

        this._checkTickedSelector = `.${this._checkClassName}${this._CHECKED_MODIFIER}`;
        
        this._checkAllBtn = document.getElementById(this._checkClassName + '-all');
        this._checkAllBtn.onchange = this.bindToThis(this._onCheckAllClick);

        this._TABLE_CELL_NAME = 'td';

        this._BTN_PREFIX = 'btn-';

        this._NONE_CATEGORY_NAME = this._locale.getString(OptionList.storage.noneCategory);

        this._statusLabel = null;

        this._HEADER_CELL_CLASS = 'form--table--cell-header';
        this._sortHeader = null;
        ArrayExtension.runForEach([...table.tHead.getElementsByClassName(this._HEADER_CELL_CLASS)], 
            ch => {
                if (!this._sortHeader)
                    this._sortHeader = ch;

                ch.onclick = this.bindToThis(this._onHeaderCellClick);
            });
            
        this._searchField = document.getElementById(this._sectionId + '--txt-search');
        this._searchField.onchange = this.bindToThis(this._onSearching);

        document.addEventListener('keydown', this.bindToThis(this._stopEnterClickButForSearch));
        
        this._render();  
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

        this._rerender();
    }

    _getDescSortClassName() {
        return this._HEADER_CELL_CLASS + '-desc';
    }

    _isSortDescending() {
        return this._sortHeader ? this._sortHeader.classList.contains(this._getDescSortClassName()): false;
    }
   
    _rerender() {
        this._clearTableRows();
        this._render();

        if (this._getSearchText())
            this._onSearching();
    }

    _clearTableRows() {
        this._clearElement(this._tableBody);
    }

    _clearElement(elem) {
        if (elem.innerHTML)
            elem.innerHTML = '';
    }

    _createLabelCell(text, title = null) {
        const label = document.createElement('label');

        if (title)
            text += ` <br><i class='form--table--cell-title'>(${title})</i>`;

        label.innerHTML = text;

        const labelCell = document.createElement(this._TABLE_CELL_NAME);
        labelCell.append(label);

        return labelCell;
    }

    _onSearching() {
        const hiddenClassName = 'form--table--row-hidden';

        const searchText = this._getSearchText();

        ArrayExtension.runForEach([...this._tableBody.rows], 
            r => {
                if (searchText.length && 
                    (r.innerText || r.textContent).toUpperCase().indexOf(searchText) === -1)
                    r.classList.add(hiddenClassName);
                else
                    r.classList.remove(hiddenClassName);
            });
    }

    _getSearchText() {
        return (this._searchField.value || '').toUpperCase();
    }

    _stopEnterClickButForSearch(event) {
        if (event.key !== 'Enter')
            return true;

        if (event.target === this._searchField)
            this._onSearching();

        event.preventDefault();
        return false;
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

    _emitEvent(callback, arg) {
        if (!callback)
            return;

        callback(arg);
    }
}

class CategoryTable extends BaseTable {
    constructor(categories = []) {
        super('category', categories);

        this._removeBtn = this._getControlByName(this._BTN_PREFIX + 'remove');
        this._removeBtn.onclick = this.bindToThis(this._removeCategory);

        this._categoryTitleTxt = this._getControlByName('txt-title');
        this._addBtn = this._getControlByName(this._BTN_PREFIX + 'add');
        this._addBtn.onclick = this.bindToThis(this._addCategory);

        this._makeDefaultBtn = this._getControlByName(this._BTN_PREFIX + 'default');
        this._makeDefaultBtn.onclick = this.bindToThis(this._makeCategoryDefault);

        const defaultCategory = categories.find(c => c.default);
        this._defaultCategoryTitle = defaultCategory ? defaultCategory.title: null;

        this.onRemoved = null;
        this.onAdded = null;
    }

    get _DEFAULT_CATEGORY_CLASS_NAME() { return 'form--table-category--row-default'; }

    _removeCategory() {
        this._hideStatus();

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

    _addCategory() {
        this._hideStatus();

        const name = this._categoryTitleTxt.value;

        const nameMaxLength = 25;

        if (!name) {
            this._showStatus(this._locale.getString('preferences-unnamed-category-warning'));
            return;
        }
        else if (name.length > nameMaxLength) {
            this._showStatus(this._locale.getStringWithArgs(
                'preferences-long-category-name-warning', nameMaxLength));
            return;
        }
        else if (name.toUpperCase() === this._NONE_CATEGORY_NAME.toUpperCase()) {
            this._showStatus(this._locale.getString('preferences-none-category-warning'));
            return;
        }
        else if (this._tableData.find(i => i.title === name)) {
            this._showStatus(
                this._locale.getStringWithArgs('preferences-duplicated-category-warning', name));
            return;
        }

        this._tableData.push(this._createNewCategory(name));

        this._sortTableData();

        this._rerender();

        this._makeDirty();

        this._categoryTitleTxt.value = null;

        this._emitEvent(this.onAdded, name);
    }

    _createNewCategory(name) {
        return { title: name };
    }

    _makeCategoryDefault() {
        this._hideStatus();

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

    refreshCategories(categories) {
        if (!categories || !categories.length)
            return;

        this._tableData = categories;

        this._sortTableData();

        this._rerender();
    }
}

class PageTable extends BaseTable {
    constructor(pagesInfo = [], pageCategories = {}, categoryView = {}) {
        super('page', pagesInfo);

        this.onImported = null;

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

        this._originalData = Array.from(this._tableData);
        this._updateImportBtnsAvailability(true);

        this._PAGES_ARCHIVE_EXTENSION = '.hltr';
        this._pagesArchive = null;

        this._pageCategories = pageCategories;

        this._categoryTitles = categoryView.categoryTitles;
        this._defaultCategoryTitle = categoryView.defaultCategoryTitle;

        this._categoryFilter = this._getControlByName('filter-category');
        this._categoryFilter.onchange = this.bindToThis(this._showCategoryPages);

        this._categorySelector = this._getControlByName('select-category');

        this._moveToCategoryBtn =  this._getControlByName(this._BTN_PREFIX + 'move');
        this._moveToCategoryBtn.onclick = this.bindToThis(this._movePagesToCategory);
        
        this._renderCategoryControls();
    }

    addPageCategory(categoryTitle) {
        this._categoryTitles.push(categoryTitle);

        this._renderCategoryControls();
        this._makeDirty();
    }

    removePageCategories(categoryTitles = []) {
        this._categoryTitles = this._categoryTitles.filter(ct => !categoryTitles.includes(ct));
        
        for (const uri in this._pageCategories)
            if (categoryTitles.includes(this._pageCategories[uri]))
                delete this._pageCategories[uri];

        this._renderCategoryControls();

        this._tableData = this._getCategoryPages();
        this._rerender();
        
        this._makeDirty();
    }

    _showCategoryPages() {
        this._clearElement(this._categorySelector);
        this._appendOptionsToCategorySelector(
            this._createCategoryOptions(this._getCurrentCategory()));

        this._tableData = this._getCategoryPages();
        this._rerender();
    }

    _appendOptionsToCategorySelector(options = []) {
        this._categorySelector.append(...options.filter(c => !c.selected));
    }

    _getCurrentCategory() {
        return this._getSelectedOption(this._categoryFilter) || this._NONE_CATEGORY_NAME;
    }

    _movePagesToCategory() {
        this._hideStatus();

        const newCategoryName = this._getSelectedOption(this._categorySelector);

        const moveToNone = newCategoryName === this._NONE_CATEGORY_NAME;
        
        if (!moveToNone && !this._categoryTitles.includes(newCategoryName)) {
            this._showStatus(this._locale.getStringWithArgs('preferences-no-category-warning', 
                newCategoryName));
            return;
        }

        const movedPageUris = this._removeRows();
        this._makeDirty();

        ArrayExtension.runForEach(movedPageUris, 
            uri => moveToNone ? delete this._pageCategories[uri]: 
                this._pageCategories[uri] = newCategoryName);
    }

    _getCategoryPages() {
        const curCategoryName = this._getCurrentCategory();

        if (curCategoryName === this._NONE_CATEGORY_NAME)
            return this._originalData.filter(d => !this._pageCategories[d.uri]);

        const curCategoryPages = Object.entries(this._pageCategories)
            .filter(pc => pc[1] === curCategoryName)
            .map(pc => pc[0]);
        return this._originalData.filter(d => curCategoryPages.includes(d.uri)) ;
    }

    _renderCategoryControls() {
        const selectedValue = this._getSelectedOption(this._categoryFilter) || 
            this._defaultCategoryTitle;

        this._clearElement(this._categoryFilter);
        this._categoryFilter.append(...this._createCategoryOptions(selectedValue));

        this._showCategoryPages();
    }

    _createCategoryOptions(selectedCategory) {
        let hasSelectedValue;

        const options = this._categoryTitles.sort().map(catTitle => {
            const selected = catTitle === selectedCategory;
            
            if (selected)
                hasSelectedValue = true;

            return this._createSelectOption(catTitle, selected);
        });
        options.unshift(this._createSelectOption(this._NONE_CATEGORY_NAME, !hasSelectedValue));

        return options;
    }

    _createSelectOption(value, selected = false) {
        const option = document.createElement('option');
        option.innerText = value;
        option.selected = selected;

        return option;
    }

    get pageCategories() {
        return this._isDirty ? this._pageCategories: null;
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

        this._moveToCategoryBtn.disabled = noneChecked || 
            !this._getSelectedOption(this._categorySelector);

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
        this._originalData = this._originalData.filter(pi => 
            !ArrayExtension.contains(this._removedPageUris, pi.uri));
            
        this._showPageBtn.disabled = true;
        this._removePageBtn.disabled = true;

        if (!this._originalData.length)
            this._updateImportBtnsAvailability(true);
    }

    _removeRows() {
        const removedPageUris = super._removeRows();

        this._tableData = this._tableData.filter(pi => 
            !ArrayExtension.contains(removedPageUris, pi.uri));

        return removedPageUris;
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
        reader.onload = async event => {
            try {
                this._updateImportBtnsAvailability(false);

                const result = event.target.result;

                let pagesToImport;

                if (!result || !(pagesToImport = JSON.parse(result)) || !pagesToImport.length)
                    throw new PagePackageError(PagePackageError.EMPTY_IMPORT_PACKAGE_TYPE);

                if (this._originalData.length)
                {
                    if (this._importIsUpsertable)
                        this._originalData = this._originalData.filter(imp => 
                            !pagesToImport.find(pi => pi.uri === imp.uri));
                    else
                        pagesToImport = pagesToImport.filter(imp => 
                            !this._originalData.find(pi => pi.uri === imp.uri));
                }
                
                const importedData = await PageInfo.savePages(pagesToImport);
                
                this._emitEvent(this.onImported, importedData);

                const importedPages = importedData.importedPages;
                this._originalData = this._originalData.concat(importedPages);

                const presentPageUris = this._originalData.map(p => p.uri);
                this._removedPageUris = this._removedPageUris.filter(
                    removedUri => !presentPageUris.includes(removedUri));

                if (importedData.pageCategories) {
                    this._pageCategories = importedData.pageCategories;
                    this._categoryTitles = new CategoryView(importedData.categories)
                        .categoryTitles;

                    this._renderCategoryControls();
                }

                this._tableData = this._getCategoryPages();
                this._sortTableData();

                this._rerender();

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

    _updateImportBtnsAvailability(isAvailable) {
        ArrayExtension.runForEach(this._importPageBtns, 
            btn => { 
                if (isAvailable)
                    isAvailable = !this._isUpsertableBtn(btn) || this._originalData.length > 0;

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

    _onExportPageBtnClick() {
        if (!this._originalData.length)
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

        this._shortcutSelector = new ShortcutSelector();

        this._pageTable = null;
        this._categories = null;
        this._defaultCategoryTitle = null;

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
            return;

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
                this._shortcutSelector.setShortcuts(loadedForm.shortcuts); 
            }
        }), this._initCategoryTable().then(() => this._initPageTable())]);
    }
	
    static loadFromStorage() {
        return new BrowserStorage(Preferences.STORAGE_KEY).get();
    }

    _initPageTable() {
        return PageInfo.getAllSavedPagesWithCategories().then(info => {
            this._pageTable = new PageTable(info.pagesInfo, info.pageCategories, 
                new CategoryView(this._categories, this._defaultCategoryTitle));

            if (this._categoryTable) {
                this._categoryTable.onAdded = 
                    this._pageTable.bindToThis(this._pageTable.addPageCategory);
                this._categoryTable.onRemoved = 
                    this._pageTable.bindToThis(this._pageTable.removePageCategories);

                this._pageTable.onImported = importedData =>
                    this._categoryTable.refreshCategories(importedData.categories);
            }
        });
    }

    _initCategoryTable() {
        return PageInfo.getAllSavedCategories().then(categories => {
            this._categoryTable = new CategoryTable(categories);
            this._categories = categories;
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
            defaultColourToken: this._defaultColourToken,
            shortcuts: this._shortcutSelector.shortcuts
        }) : Promise.resolve();
    }

    _preferencesHaveChanged() {
        const pureValues = this._loadedPreferences;

        return !pureValues || pureValues.shouldWarn !== this._shouldWarn || 
            pureValues.shouldLoad !== this._shouldLoad || 
            pureValues.defaultColourToken !== this._defaultColourToken ||
            this._shortcutSelector.shortcuts;
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

export { PagePackageError, Preferences };