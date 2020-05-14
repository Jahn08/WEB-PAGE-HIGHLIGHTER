class Shortcut {
    constructor(keyCombination) {
        const keys = Object.keys(keyCombination);

        const keysLength = keys.length;

        let name;
        let values;

        if (keysLength > 1 && keysLength < 3) {
            name = this._sortItems(Object.values(keyCombination)).join('-');
            values = this._sortItems(keys);
        }
        else
            name = values = '';

        this.name = name;
        this.values = values;
    }

    _sortItems(items) {
        return items.sort((a, b) => {
            if (isNaN(Number(a)))
                return a - b;

            return 1;
        });
    }

    static extractKeyInfo(event) {
        if (!event.key || !event.code || event.ctrlKey || event.shiftKey || 
            event.code === 'PrintScreen')
            return this._constructKeyInfo('', '');

        const code = event.code;
        const upperCode = code.toUpperCase();
        
        const char = event.key;
        const upperChar = char.toUpperCase();
        
        let name;
        let outputCode;

        const prefixes = ['KEY', 'DIGIT'];
        let prefix;

        if ((prefix = prefixes.find(p => upperCode.startsWith(p))))
            outputCode = name = upperCode.slice(prefix.length);
        else if (event.altKey && upperChar.startsWith('ALT')) {
            outputCode = char.toUpperCase();
            name = char;
        }
        else if (event.location === 3) {
            outputCode = upperCode;
            name = this._getSymbolName(char);
        }
        else {
            outputCode = upperCode;
            name = this._getSymbolName(code);
        }

        return this._constructKeyInfo(outputCode, name);
    }

    static _getSymbolName(code) {
        if (!this._symbolNames)
            this._symbolNames = {
                'BracketLeft': '[',
                'BracketRight': ']',
                'Slash': '/',
                'Semicolon': ';',
                'Comma': ',',
                'Period': '.',
                'Quote': '\'',
                'Backquote': '`',
                'Backslash': '\\',
                'ArrowLeft': '←',
                'ArrowRight': '→',
                'ArrowUp': '↑',
                'ArrowDown': '↓',
                'Minus': '-',
                'Equal': '=',
                'Unidentified': '5'
            };

        return this._symbolNames[code] || code;
    }

    static _constructKeyInfo(code, name) { return { code, name }; }
}
