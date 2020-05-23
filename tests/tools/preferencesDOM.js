import assert from 'assert';
import { Randomiser } from './randomiser.js';
import { EnvLoader } from './envLoader.js';

class PreferencesDOM {
    constructor(sectionName) {
        this._sectionId = 'form--section-' +  sectionName;

        this._STATUS_WARNING_CLASS = 'form-section-status--label-warning';
    }

    get sectionId() {
        return this._sectionId;
    }

    _getSectionControl(ctrlName) {
        return document.getElementById(`${this._sectionId}--${ctrlName}`);
    }

    dispatchClickEvent(clickableCtrl) {
        this._dispatchEvent(clickableCtrl, new Event('click'));
    }

    _dispatchEvent(ctrl, event) {
        assert(!ctrl.disabled);
        ctrl.dispatchEvent(event);
    }

    dispatchChangeEvent(changeableCtrl) {
        this._dispatchEvent(changeableCtrl, new Event('change'));
    }

    dispatchEnterClickEvent(clickableCtrl) {
        this._dispatchEvent(clickableCtrl, 
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }

    _getButton(name) {
        return this._getSectionControl(`btn-${name}`);
    }

    assertStatusIsEmpty() { this._getAssertedStatusLabel(0); }

    assertStatusIsMessage(expectedSubstring) {
        return this._assertStatus(false, expectedSubstring);
    }

    _assertStatus(isWarning, expectedSubstring, expectedMsgNumber = 1) {
        const statusLabel = this._getAssertedStatusLabel(expectedMsgNumber);

        const msg = statusLabel.innerText;
        assert(msg);
        assert.strictEqual(statusLabel.classList.contains(this._STATUS_WARNING_CLASS), 
            isWarning);

        if (expectedSubstring)
            assert(msg.toUpperCase().includes(expectedSubstring.toUpperCase()));

        return msg;
    }

    assertStatusIsWarning(expectedSubstring = null, expectedMsgNumber = 1) {
        return this._assertStatus(true, expectedSubstring, expectedMsgNumber);
    }

    _getAssertedStatusLabel(expectedMsgNumber = 1) { 
        const statusSection = this._getStatusSection();
        assert.strictEqual(statusSection.childNodes.length, expectedMsgNumber);

        return expectedMsgNumber ? statusSection.childNodes.item(0) : null;
    }

    _getStatusSection() {
        return document.getElementById(this.sectionId + '--status');
    }

    hasStatusMessages() {
        return this._getStatusSection().childNodes.length > 0;
    }

    static loadDomModel() {
        return EnvLoader.loadDomModel('./views/preferences.html');
    }

    static getSelectOptionTexts(selectCtrl) {
        return [...selectCtrl.options].map(op => op.innerText);
    }

    static getSelectOptionValues(selectCtrl) {
        return [...selectCtrl.options].map(op => op.value);
    }
}

class ShortcutPreferencesDOM extends PreferencesDOM {
    constructor() {
        super('shortcuts');
    }

    getCommandSelector() {
        return this._getSectionControl('select');
    }

    getCommandInput() {
        return this._getSectionControl('txt-input');
    }

    getApplyButton() {
        return this._getButton('apply');
    }

    getClearButton() {
        return this._getButton('clear');
    }

    createKeyboardEventOptions(shortcut) {
        return shortcut.split('-').map(k => this.createKeyboardEventOption(k, k));
    }

    createKeyboardEventOptionWithShift() {
        const option = this.createKeyboardEventOption();
        option.shiftKey = true;

        return option;
    }

    createKeyboardEventOption(key = null, code = null) {
        return { 
            key: key || Randomiser.getRandomString(),
            code: code || Randomiser.getRandomString()
        };
    }

    createKeyboardEventOptionWithCtrl() {
        const option = this.createKeyboardEventOption();
        option.ctrlKey = true;

        return option;
    }

    dispatchCombination(shouldApply, ...eventOptions) {
        const control = this.getCommandInput();

        if (!eventOptions.length)
            eventOptions = [this.createKeyboardEventOption(), this.createKeyboardEventOption()];

        eventOptions.forEach(op => this.dispatchKeyDownEvent(control, op));
        this.dispatchKeyUpEvent(control, eventOptions[0]);

        if (shouldApply)
            this.dispatchClickEvent(this.getApplyButton());
    }

    dispatchKeyDownEvent(control, eventOptions = null) {
        this._dispatchKeyboardEvent(control, 'keydown', eventOptions);
    }

    _dispatchKeyboardEvent(clickableCtrl, eventName, eventOptions = null) {
        const event = new KeyboardEvent(eventName, eventOptions || this.createKeyboardEventOption());
        this._dispatchEvent(clickableCtrl, event);
    }

    dispatchKeyUpEvent(control, eventOptions = null) {
        this._dispatchKeyboardEvent(control, 'keyup', eventOptions);
    }

    static createTestShortcuts(numberOfCombinations = 3) {
        const markingOptions = OptionList.marking;
        const noteOptions = OptionList.noting;
        const storageOptions = OptionList.storage;
        const shortcuts = [markingOptions.mark, markingOptions.unmark, noteOptions.add, 
            noteOptions.remove, storageOptions.save, storageOptions.load].reduce((prev, cur, i) => {
            if (i < numberOfCombinations)
                prev[cur] = {
                    key: `${Randomiser.getRandomString()}-${Randomiser.getRandomString()}`
                };
            return prev;
        }, {});

        return shortcuts;
    }
    
    static assertTitleHasNoShortcut(title) {
        assert(!title.includes('('));
        assert(!title.includes(')'));
    }

    static assertTitleHasShortcut(title, shortcut) {
        assert(title.endsWith(`(${shortcut.key})`));
    }
}

class PreferencesTableDOM extends PreferencesDOM {
    constructor(sectionName) {
        super(sectionName);

        this._HEADER_CLASS_NAME = 'form--table--cell-header';
    }

    getTableHeaders() {
        return [...document.getElementById(this._sectionId)
            .getElementsByClassName(this._HEADER_CLASS_NAME)];
    }

    isHeaderSortedAsc(header) {
        return this._checkSortDirection(header, true);
    }
        
    _checkSortDirection(elem, isAscending) {
        return elem.classList.contains(`${this._HEADER_CLASS_NAME}-${(isAscending ? 'asc': 'desc')}`);
    }

    isHeaderSortedDesc(header) {
        return this._checkSortDirection(header, false);
    }

    getTableBody() {
        const table = this._getSectionControl('table');
        assert(table);

        assert(table.tHead);
        assert.strictEqual(table.tBodies.length, 1);

        return table.tBodies[0];
    }

    tickAllRowChecks() {
        const allPagesCheck = this._getAllRowsCheck();
                        
        allPagesCheck.checked = !allPagesCheck.checked;
        this.dispatchChangeEvent(allPagesCheck);
    }

    _getAllRowsCheck() {
        return this._getSectionControl('table--check-all');
    }

    assertTableValues(expectedRowValues = []) {
        const tableBody = this.getTableBody();

        assert.strictEqual(tableBody.rows.length, expectedRowValues.length);

        this._assertRowValues([...tableBody.rows], expectedRowValues);
        
        const rowKeys = [...tableBody.querySelectorAll('input[type=checkbox]')]
            .map(this._getRowKey);
        assert(expectedRowValues.every(rv => rowKeys.includes(this._getRowKey(rv))));
        assert.strictEqual(rowKeys.length, expectedRowValues.length);
    }
   
    _assertRowValues() { }

    tickRowCheckByIndex(checkIndex) {
        const rows = this.getTableBody().rows;
        
        const selectedRows = [];
        selectedRows.push(rows.item(checkIndex));
        
        return this._checkSelectedRows(selectedRows)[0];
    }

    _checkSelectedRows(selectedRows) {
        return selectedRows.map(r => {
            const rowCheck = r.querySelector('input[type=checkbox]');
            rowCheck.checked = true;

            this.dispatchChangeEvent(rowCheck);
            return this._getRowKey(rowCheck);
        });
    }

    tickRowCheck(tickNumber = 1) {
        const rows = this.getTableBody().rows;

        const selectedRows = [];

        if (tickNumber === 1)
            selectedRows.push(rows.item(Randomiser.getRandomNumber(rows.length)));
        else
            for (let i = 0; i < tickNumber && i < rows.length; ++i)
                selectedRows.push(rows.item(i));
        
        return this._checkSelectedRows(selectedRows);
    }

    _getRowKey() { }

    getSearchField() {
        return this._getSectionControl('txt-search');
    }
    
    getRemovingBtn() {
        return this._getButton('remove');
    }
}

class PagePreferencesDOM extends PreferencesTableDOM {
    constructor() {
        super('page');
    }

    _assertRowValues(rows, expectedRowValues) {
        const rowContents = rows.map(r => r.textContent);
        assert(expectedRowValues.every(rv => rowContents.find(rc => 
            rc.indexOf(rv.title) !== -1 && rc.indexOf(PagePreferencesDOM.formatDate(rv.date)) !== -1)
        ));
    }

    static formatDate(ticks) {
        const date = new Date(ticks);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }

    _getRowKey(row) {
        return (row.dataset || row).uri;
    }

    getCategoryFilterList() {
        return this._getSectionControl('filter-category');
    }
    
    getCategorySelectorList() {
        return this._getSectionControl('select-category');
    }

    getRelocatingBtn() {
        return this._getButton('move');
    }
}

class CategoryPreferencesDOM extends PreferencesTableDOM {
    constructor() {
        super('category');
    }

    static isNoneCategory(categoryTitle) { 
        return (categoryTitle || '').toUpperCase() === 'NONE';
    }

    _assertRowValues(rows, expectedRowValues) {
        const rowContents = rows.map(r => ({ content: r.textContent, default: this._hasDefaultCategory(r) }));
        assert(expectedRowValues.every(rv => rowContents.find(rc => 
            rc.content.indexOf(rv.title) !== -1 && !rc.default == !rv.default)
        ));
    }

    _hasDefaultCategory(rowEl) {
        return rowEl.classList.contains('form--table-category--row-default');
    } 

    _getRowKey(row) {
        return (row.dataset || row).title;
    }

    getAddingBtn() {
        return this._getButton('add');
    }

    getMakingDefaultBtn() {
        return this._getButton('default');
    }

    getNewCategoryTitleTxt() {
        return this._getSectionControl('txt-title');
    }
}

export { PagePreferencesDOM, CategoryPreferencesDOM, ShortcutPreferencesDOM };
