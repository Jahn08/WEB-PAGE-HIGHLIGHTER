import assert from 'assert';
import { Randomiser } from './randomiser.js';
import { EnvLoader } from './envLoader.js';

class PreferencesDOM {
    constructor(sectionName) {
        this._sectionPage = 'form--section-' +  sectionName;

        this._headerClassName = 'form--table--cell-header';
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
    
    createClickEvent() { return  new Event('click'); }

    createChangeEvent() { return new Event('change'); }

    getTableHeaders() {
        return [...document.getElementById(this._sectionPage)
            .getElementsByClassName(this._headerClassName)];
    }

    isHeaderSortedAsc(header) {
        return this._checkSortDirection(header, true);
    }
        
    _checkSortDirection(elem, isAscending) {
        return elem.classList.contains(`${this._headerClassName}-${(isAscending ? 'asc': 'desc')}`);
    }

    isHeaderSortedDesc(header) {
        return this._checkSortDirection(header, false);
    }

    getSearchField() {
        return document.getElementById(this._sectionPage + '--txt-search');
    }

    getAllRowsCheck() {
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

    tickPageInfoCheck(tickNumber = 1) {
        const rows = this.getTableBody().rows;

        const selectedRows = [];

        if (rows === 1)
            selectedRows.push(rows.item(Randomiser.getRandomNumber(rows.length)));
        else
            for (let i = 0; i < tickNumber && i < rows.length; ++i)
                selectedRows.push(rows.item(i));
        
        return selectedRows.map(r => {
            const rowCheck = r.querySelector('input[type=checkbox]');
            rowCheck.checked = true;

            rowCheck.dispatchEvent(this.createChangeEvent());
            return this._getRowKey(rowCheck);
        });
    }

    _getRowKey() { }

    getRemovingBtn() {
        return document.getElementById(this._sectionPage + '--btn-remove');
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
            rc.indexOf(rv.title) !== -1 && rc.indexOf(PagePreferencesDOM.formatDate(rv.date)) !== -1) !== null
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
        const rowContents = rows.map(r => ({ content: r.textContent, isDefault: this._hasDefaultCategory(r) }));
        assert(expectedRowValues.every(rv => rowContents.find(rc => 
            rc.content.indexOf(rv.title) !== -1 && rc.isDefault == rv.isDefault) !== null
        ));
    }

    _hasDefaultCategory(rowEl) {
        return rowEl.classList.contains('form--table-category--row-default');
    } 

    _getRowKey(row) {
        return (row.dataset || row).title;
    }
}

export { PagePreferencesDOM, CategoryPreferencesDOM };
