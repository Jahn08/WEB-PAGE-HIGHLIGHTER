import { ColourList } from './colourList.js';

export class Preferences {
    constructor() {
        this._initColourList();
        
        this._savedPages = null;
        this._removedPages = new Set();

        this._initPageList();

        this._storage = new window.BrowserStorage(Preferences.STORAGE_KEY);
    }
	
    static get STORAGE_KEY() {
        return 'preferences';
    }

    _initColourList() {
        const colourListEl = document.getElementById('form--section-colours');
        
        if (colourListEl.childElementCount)
            throw this._buildRepeatInitError();

        colourListEl.append(...ColourList.colours.map((c, index) => {
            const groupEl = document.createElement('div');

            const radio = document.createElement('input');
            radio.name = this._COLOUR_RADIO_CLASS;
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
    
    _buildRepeatInitError() {
        const err = new Error('The page has already been initialised');
        err.name = 'RepeatInitError';

        return err;
    }

    _initPageList() {
        const formTableId = 'form--table-pages';

        const pageTable = document.getElementById(formTableId);
        const pageTableBody = pageTable.tBodies[0];
        
        if (pageTableBody.childElementCount)
            throw this._buildRepeatInitError();

        const checkClassName = formTableId + '--check';
        
        const checkedModifier = ':checked';                
        const checkTickedSelector = `.${checkClassName}${checkedModifier}`;

        window.PageInfo.getAllSavedPages().then(pageUris => {
            this._savedPages = new Set(pageUris);

            const checkAllId = checkClassName + '-all';
    
            document.getElementById(checkAllId).onclick = _event => {
                const shouldCheck = _event.target.checked;
                const modifier = shouldCheck ? `:not(${checkedModifier})` : checkedModifier;
                
                document.querySelectorAll('.' + checkClassName + modifier)
                    .forEach(el => el.checked = shouldCheck);
            };

            const onCheck = () => {
                const checkedNumber = 
                    document.querySelectorAll(checkTickedSelector).length;
                
                showPageBtn.disabled = checkedNumber !== 1;
                removePageBtn.disabled = checkedNumber === 0;

                document.getElementById(checkAllId).checked = 
                    checkedNumber == this._savedPages.size;
            };
    
            pageTableBody.append(...pageUris.map(uri => {
                const row = document.createElement('tr');

                const check = document.createElement('input');
                check.value = uri;
                check.className = checkClassName;
                check.type = 'checkbox';
                check.onchange = onCheck;

                const tableCellElemName = 'td';
                const checkCell = document.createElement(tableCellElemName);
                checkCell.append(check);
    
                const label = document.createElement('label');
                label.innerHTML = uri;

                const labelCell = document.createElement(tableCellElemName);
                labelCell.append(label);

                row.append(checkCell, labelCell);
                return row;
            }));
        });

        const showPageBtn = document.getElementById('form--section-page--btn-show');
        const removePageBtn = document.getElementById('form--section-page--btn-remove');

        showPageBtn.onclick = () => {
            const uri = document.querySelector(checkTickedSelector).value;
            
            if (uri)
                window.open(window.PageInfo.generateLoadingUrl(uri), '_blank');
        };

        removePageBtn.onclick = () => {
            if (!this._savedPages)
                return;

            document.querySelectorAll(checkTickedSelector)
                .forEach(el => {
                    this._savedPages.delete(el.value);
                    this._removedPages.add(el.value);

                    el.parentElement.parentElement.remove();
                });
        };
    }

    load() {
        return Preferences.loadFromStorage().then(loadedForm => {
            if (loadedForm) {
                this._shouldWarn = loadedForm.shouldWarn;
                this._shouldLoad = loadedForm.shouldLoad;
                this._defaultColourToken = loadedForm.defaultColourToken;
            }
        });
    }
	
    static loadFromStorage() {
        return new window.BrowserStorage(Preferences.STORAGE_KEY).get();
    }

    save() {
        return Promise.all(this._storage.set({
            shouldWarn: this._shouldWarn,
            shouldLoad: this._shouldLoad,
            defaultColourToken: this._defaultColourToken
        }), window.BrowserStorage.remove([...this._removedPages]));
    }
    
    get _shouldWarn() {
        return this._getCheckbox(this._WARNING_CHECK_ID_POSTFIX).checked;
    }

    set _shouldWarn(value) {
        this._getCheckbox(this._WARNING_CHECK_ID_POSTFIX).checked = value;
    }

    get _WARNING_CHECK_ID_POSTFIX() {
        return 'warning';
    }
    
    get _shouldLoad() {
        return this._getCheckbox(this._LOADING_CHECK_ID_POSTFIX).checked;
    }

    set _shouldLoad(value) {
        this._getCheckbox(this._LOADING_CHECK_ID_POSTFIX).checked = value;
    }

    get _LOADING_CHECK_ID_POSTFIX() {
        return 'loading';
    }

    _getCheckbox(idPostfix) {
        return document.getElementById('form--check-' + idPostfix);
    }
    
    get _defaultColourToken() {
        return [...document.getElementsByName(this._COLOUR_RADIO_CLASS)]
            .find(c => c.checked).value;
    }

    set _defaultColourToken(colourToken) {
        const colourRadio = document.querySelector(`input[value='${colourToken}']`);
		
        if (colourRadio)
            colourRadio.checked = true;
    }
    
    get _COLOUR_RADIO_CLASS () {
        return 'form--section-colours--radio';
    }
}
