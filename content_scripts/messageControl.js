class MessageControl {
    static get BLANKET_PARAGRAPH_ELEM_ID() {
        return MessageControl.BLANKET_ELEM_ID + '--paragraph';
    }

    static get BLANKET_ELEM_ID() {
        return 'blanket';
    }

    static show(text) {
        if (!text)
            return;

        let paragraph;

        const blanket = MessageControl._existentBlanket;

        if (blanket)
            blanket.className = '';
        else
            document.documentElement.append(MessageControl._constructBlanket(text));
            
        if (!(paragraph = MessageControl._existentParagraph))
            blanket.append(MessageControl._appendParagraph(text));

        paragraph.innerHTML = text;
    }

    static get _existentBlanket() {
        return document.getElementById(MessageControl.BLANKET_ELEM_ID);    
    }

    static _constructBlanket(text) {
        const blanket = document.createElement('div');
        blanket.id = MessageControl.BLANKET_ELEM_ID;

        blanket.append(MessageControl._appendParagraph(text));
        return blanket;
    }

    static _appendParagraph(text) {
        const paragraph = document.createElement('p');
        paragraph.id = MessageControl.BLANKET_PARAGRAPH_ELEM_ID;
        paragraph.innerHTML = text;
        
        return paragraph;
    }

    static get _existentParagraph() {
        return document.getElementById(MessageControl.BLANKET_PARAGRAPH_ELEM_ID);
    }

    static hide() {
        const blanket = MessageControl._existentBlanket;

        if (!blanket || blanket.className !== '')
            return Promise.resolve();

        return MessageControl._applyAnimation(blanket, 'disappear')
            .then(ctrl => MessageControl._applyAnimation(ctrl, 'leave'));
    }

    static _applyAnimation(elem, animationName) {
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

window.MessageControl = MessageControl;
