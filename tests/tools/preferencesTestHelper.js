import assert from 'assert';
import { Preferences } from '../../components/preferences.js';
import { Randomiser } from './randomiser.js';

class PreferencesTestHelper {
    constructor(tableDOM) {
        this._tableDOM = tableDOM;
    }

    searchByEnterClick(items) {
        return this._testSearching(items, 
            searchField => this._tableDOM.dispatchEnterClickEvent(searchField));
    }

    async _testSearching(items, activateSearchFn) {
        await new Preferences().load();

        const searchField = this._tableDOM.getSearchField();
        assert(searchField);
        
        const categoryToFind = Randomiser.getRandomArrayItem(items);

        const titleToSearch = '' + categoryToFind.title;
        const textToSearch = titleToSearch.substring(titleToSearch.length - titleToSearch.length / 2);
        
        searchField.value = textToSearch;

        activateSearchFn(searchField);
        
        const tableBody = this._tableDOM.getTableBody();

        const targetText = textToSearch.toUpperCase();

        assert([...tableBody.rows].filter(r => !r.textContent.toUpperCase().includes(targetText))
            .every(r => r.classList.contains('form--table--row-hidden')));
    }

    searchByInputting(items) {
        return this._testSearching(items, 
            searchField => this._tableDOM.dispatchChangeEvent(searchField));
    }

    async removeFirstTwoRows() {
        const preferences = new Preferences();

        await preferences.load();

        const keysForRemoval = this._tableDOM.tickRowCheck(2);

        const btn = this._tableDOM.getRemovingBtn();
        assert(!btn.disabled);
        
        this._tableDOM.dispatchClickEvent(btn);

        await preferences.save();

        return keysForRemoval;
    }
}

export { PreferencesTestHelper };