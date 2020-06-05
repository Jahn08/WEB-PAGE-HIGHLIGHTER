// eslint-disable-next-line no-unused-vars
class Shortcut {
    constructor(keyCombination) {
        const combination = keyCombination.reduce((prev, cur) => {
            if (!prev.includes(cur))
                prev.push(cur);

            return prev;
        }, []);

        const keysLength = combination.length;
        this.key = keysLength > 1 && keysLength < 4 ?
            this._sortItems(Object.values(combination)).join('-') : '';
    }

    _sortItems(items) {
        return items.sort((a, b) => {
            if (isNaN(Number(a)))
                return a - b;

            return 1;
        });
    }

    getCommandsInUse(shortcutCommands, strictlyEqual) {
        return this.key ? Shortcut.getCommandsInUse(shortcutCommands, this.key, strictlyEqual) : [];
    }

    static getCommandsInUse(shortcutCommands, shortcutKey, strictlyEqual) {
        const commands = [];
        
        if (!shortcutKey || !shortcutCommands)
            return commands;

        for (const key in shortcutCommands) {
            const combination = shortcutCommands[key];

            if (!combination)
                continue;

            const cmdKey = combination.key.toUpperCase();
            if ((strictlyEqual && cmdKey === shortcutKey) || 
                (!strictlyEqual && (cmdKey.startsWith(shortcutKey) || shortcutKey.startsWith(cmdKey))))
                commands.push(key);
        }

        return commands; 
    }

    static extractKeyInfo(event) {
        if (!event.key || !event.code || event.ctrlKey || event.shiftKey || 
            event.code === 'PrintScreen')
            return '';

        const upperCode = event.code.toUpperCase();
        const upperChar = event.key.toUpperCase();

        let key;

        const prefixes = ['KEY', 'DIGIT'];
        let prefix;

        if ((prefix = prefixes.find(p => upperCode.startsWith(p))))
            key = upperCode.slice(prefix.length);
        else if (event.altKey && upperChar.startsWith('ALT'))
            key = upperChar;
        else if (event.location === 3)
            key = this._getSymbolName(upperChar);
        else
            key = this._getSymbolName(upperCode);

        return key;
    }

    static _getSymbolName(code) {
        if (!this._symbolNames)
            this._symbolNames = {
                'BRACKETLEFT': '[',
                'BRACKETRIGHT': ']',
                'SLASH': '/',
                'SEMICOLON': ';',
                'COMMA': ',',
                'PERIOD': '.',
                'QUOTE': '\'',
                'BACKQUOTE': '`',
                'BACKSLASH': '\\',
                'ARROWLEFT': '←',
                'ARROWRIGHT': '→',
                'ARROWUP': '↑',
                'ARROWDOWN': '↓',
                'MINUS': '-',
                'EQUAL': '=',
                'UNIDENTIFIED': '5'
            };

        return this._symbolNames[code] || code;
    }
}