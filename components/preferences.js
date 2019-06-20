import { ColourList } from './colourList.js';

export class Preferences {
	constructor() {
		this._appendColourList();
		
		this._storage = new BrowserStorage(Preferences.STORAGE_KEY);
	}
	
	static get STORAGE_KEY() {
		return 'preferences';
	}

	_appendColourList() {
		const colourListEl = document.getElementById('colours');
		
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
		return new BrowserStorage(Preferences.STORAGE_KEY).get();
	}

	save() {
		return this._storage.set({
			shouldWarn: this._shouldWarn,
			shouldLoad: this._shouldLoad,
			defaultColourToken: this._defaultColourToken
		});
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
		return document.getElementById('option--checkbox-' + idPostfix);
	}
    
    get _defaultColourToken() {
        return [...document.getElementsByName(this._COLOUR_RADIO_CLASS)]
            .find(c => c.checked).value;
    }

	set _defaultColourToken(colourToken) {
		const colourRadio = document.querySelector(`input[value='${colourToken}']`)
		
		if (colourRadio)
			colourRadio.checked = true;
    }
    
    get _COLOUR_RADIO_CLASS () {
		return 'option--radio-colour';
	}
}
