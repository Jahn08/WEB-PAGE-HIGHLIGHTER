class MessageControl {
    constructor () {
        this._blanket = null;
        this._paragraph = null;
    }

    get BLANKET_PARAGRAPH_ELEM_ID() {
        return this.BLANKET_ELEM_ID + '--paragraph';
    }

    get BLANKET_ELEM_ID() {
        return 'blanket';
    }

    show(text) {
        if (!text)
            return;

        let blanket;
        let paragraph;

        if (blanket = this._existentBlanket)
            blanket.className = '';
        else
            document.documentElement.append(this._constructBlanket(text));
            
        if (!(paragraph = this._existentParagraph))
            blanket.append(this._appendParagraph(text));

        paragraph.innerHTML = text;
    }

    get _existentBlanket() {
        return this._blanket || (this._blanket = document.getElementById(this.BLANKET_ELEM_ID));    
    }

    _constructBlanket(text) {
        const blanket = document.createElement('div');
        blanket.id = this.BLANKET_ELEM_ID;

        blanket.append(this._appendParagraph(text));
        return this._blanket = blanket;
    }

    _appendParagraph(text) {
        const paragraph = document.createElement('p');
        paragraph.id = this.BLANKET_PARAGRAPH_ELEM_ID;
        paragraph.innerHTML = text;
        
        return this._paragraph = paragraph;
    }

    get _existentParagraph() {
        return this._paragraph || 
            (this._paragraph = document.getElementById(this.BLANKET_PARAGRAPH_ELEM_ID));
    }

    hide() {
        const blanket = this._existentBlanket;

        if (!blanket)
            return;

        this._applyAnimation(blanket, 'disappear')
            .then(ctrl => this._applyAnimation(ctrl, 'leave'));
    }

    _applyAnimation(elem, animationName) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (!elem)
                    return reject(new Error(`An element to apply animation ${animationName} is undefined`));

                elem.classList.add([elem.id, animationName].join('-'));
                resolve(elem);
            }, 1000);
        });
    }
}
