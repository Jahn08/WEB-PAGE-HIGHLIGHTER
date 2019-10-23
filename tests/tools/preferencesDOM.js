import assert from 'assert';
import { Randomiser } from './randomiser.js';
import { EnvLoader } from './envLoader.js';

class PreferencesDOM {
    constructor(sectionId) {
        this._sectionPage = sectionId;

        this._headerClassName = 'form--table--cell-header';
    }

    get sectionId() {
        return this._sectionPage;
    }

    static createPageTable() {
        return new PreferencesDOM('form--section-page');
    }

    getPageTableBody() {
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

    assertPageTableValues(expectedRowValues = []) {
        const tableBody = this.getPageTableBody();

        assert.strictEqual(tableBody.rows.length, expectedRowValues.length);
        const rowContents = [...tableBody.rows].map(r => r.textContent);

        assert(expectedRowValues.every(rv => rowContents.find(rc => 
            rc.indexOf(rv.title) !== -1 && rc.indexOf(this.formatDate(rv.date)) !== -1) !== null
        ));
        
        const rowUris = [...tableBody.querySelectorAll('input[type=checkbox]')]
            .map(ch => ch.dataset.uri);

        assert.strictEqual(rowUris.length, expectedRowValues.length);
        assert(expectedRowValues.every(rv => rowUris.includes(rv.uri)));
    }
    
    formatDate(ticks) {
        const date = new Date(ticks);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }

    tickPageInfoCheck(tickNumber = 1) {
        const rows = this.getPageTableBody().rows;

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
            return rowCheck.dataset.uri;
        });
    }
    
    getRemovingBtn() {
        return document.getElementById(this._sectionPage + '--btn-remove');
    }

    static loadDomModel() {
        return EnvLoader.loadDomModel('./views/preferences.html');
    }
}

export { PreferencesDOM };
