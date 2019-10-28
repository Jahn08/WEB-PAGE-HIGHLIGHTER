import assert from 'assert';
import { Randomiser } from './randomiser.js';
import { EnvLoader } from './envLoader.js';

class PreferencesDOM {
    constructor(sectionName) {
        this._sectionPage = 'form--section-' +  sectionName;

        this._HEADER_CLASS_NAME = 'form--table--cell-header';

        this._STATUS_WARNING_CLASS = 'form-section-status--label-warning';
    }

    get sectionId() {
        return this._sectionPage;
    }

    getTableBody() {
        const table = document.getElementById(this._sectionPage + '--table');
        assert(table);

        assert(table.tHead);
        assert.strictEqual(table.tBodies.length, 1);

        return table.tBodies[0];
    }

    dispatchClickEvent(clickableCtrl) {
        if (clickableCtrl.disabled)
            return;

        this._dispatchEvent(clickableCtrl, new Event('click'));
    }

    _dispatchEvent(ctrl, event) {
        ctrl.dispatchEvent(event);
    }

    dispatchChangeEvent(changeableCtrl) {
        this._dispatchEvent(changeableCtrl, new Event('change'));
    }

    dispatchEnterClickEvent(clickableCtrl) {
        this._dispatchEvent(clickableCtrl, 
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }

    getTableHeaders() {
        return [...document.getElementById(this._sectionPage)
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

    getSearchField() {
        return document.getElementById(this._sectionPage + '--txt-search');
    }

    tickAllRowsCheck() {
        const allPagesCheck = this._getAllRowsCheck();
                        
        allPagesCheck.checked = !allPagesCheck.checked;
        this.dispatchChangeEvent(allPagesCheck);
    }

    _getAllRowsCheck() {
        return document.getElementById(this._sectionPage + '--table--check-all');
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

    getRemovingBtn() {
        return this._getButton('remove');
    }

    _getButton(name) {
        return document.getElementById(`${this._sectionPage}--btn-${name}`);
    }

    assertStatusIsEmpty() { this._getAssertedStatusLabel(0); }

    assertStatusIsMessage(expectedSubstring) {
        return this._assertStatus(false, expectedSubstring);
    }

    _assertStatus(isWarning, expectedSubstring) {
        const statusLabel = this._getAssertedStatusLabel(1);

        const msg = statusLabel.innerText;
        assert(msg);
        assert.strictEqual(statusLabel.classList.contains(this._STATUS_WARNING_CLASS), 
            isWarning);

        if (expectedSubstring)
            assert(msg.toUpperCase().includes(expectedSubstring.toUpperCase()));

        return msg;
    }

    assertStatusIsWarning(expectedSubstring = null) {
        return this._assertStatus(true, expectedSubstring);
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
}

class PagePreferencesDOM extends PreferencesDOM {
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
}

class CategoryPreferencesDOM extends PreferencesDOM {
    constructor() {
        super('category');
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
        return document.getElementById(this._sectionPage + '--txt-title');
    }
}

export { PagePreferencesDOM, CategoryPreferencesDOM };
