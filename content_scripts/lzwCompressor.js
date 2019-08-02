class LZWCompressor {
    static compress(str) {
        const dict = {};
        const outcome = [];

        const data = this._prepareData(str);
        let phrase = data[0];

        let code = this._INITIAL_CODE;

        let currChar;

        for (let i = 1; i < data.length; ++i) {
            currChar = data[i];

            if (dict[phrase + currChar]) {
                phrase += currChar;
                continue;
            }

            outcome.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
            dict[phrase + currChar] = code++;
            phrase = currChar;
        }

        outcome.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
        
        for (let i = 0; i< outcome.length; ++i)
            outcome[i] = String.fromCharCode(outcome[i]);

        return outcome.join('');
    }

    static _prepareData(str) {
        return (str + '').split('');
    }

    static get _INITIAL_CODE() {
        return 256;
    }

    static decompress(str) {
        const dict = {};
        
        const data = this._prepareData(str);
        let currChar = data[0];
        let oldPhrase = currChar;
        
        const outcome = [currChar];
        
        const initialCode = this._INITIAL_CODE;
        let code = initialCode;
        
        let phrase;
        
        for (let i = 1; i < data.length; ++i) {
            const currCode = data[i].charCodeAt(0);

            if (currCode < initialCode)
                phrase = data[i];
            else
                phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);

            outcome.push(phrase);
            currChar = phrase.charAt(0);
            dict[code++] = oldPhrase + currChar;
            oldPhrase = phrase;
        }

        return outcome.join('');
    }
}
