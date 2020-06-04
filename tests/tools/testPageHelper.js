export class TestPageHelper {
    static removeExcessSpaces(text) {
        return text.replace(/\s+/gm, ' ').trim();
    }

    static setRange(setRangeContainersCallback) {
        const range = document.createRange();
        setRangeContainersCallback(range);

        return range;
    }

    static setMultipleRanges(setRangeContainersCallbacks = []) {
        return setRangeContainersCallbacks.map((fn, index) => {
            if (!index)
                return TestPageHelper.setRange(fn);
            
            const range = document.appendRange();
            fn(range);
            
            return range;
        });
    }

    static setRangeForEntireNodes(range) {
        range.setStart(document.querySelector('.article--paragraph--sentence--label'));
        range.setEnd(document.querySelector('.article--paragraph--sentence--bold--italic'));    
    }
    
    static setRangeForPartlySelectedItalicSentenceNode(range, startOffset = 29, endOffset = 50) {
        const italicNode = TestPageHelper.getFirstItalicSentenceNode();
        range.setStart(italicNode, startOffset);
        range.setEnd(italicNode, endOffset);
    }

    static getFirstItalicSentenceNode() {
        return document.querySelector('.article--paragraph--sentence--italic');
    } 

    static setRangeForPartlySelectedNodes(range) {
        range.setStart(TestPageHelper.getFirstItalicSentenceNode(), 37);
        range.setEnd(document.querySelector('.article--paragraph--sentence--bold--italic'), 37);   
    }

    static get PARTLY_SELECTED_NODES_TEXT() {
        return 'or Firefox are built using the WebExtensions API, a cross-browser system f';
    }

    static setRangeForLastParagraphSentenceNode(range) {
        const node = TestPageHelper.getLastParagraphSentenceNode();
        range.setStart(node);
        range.setEnd(node);
    }

    static getLastParagraphSentenceNode() {
        return document.querySelector('#article--paragraph-last .article--paragraph--sentence');
    } 

    static setRangeForSeveralParagraphs(range) {
        range.setStart(TestPageHelper.getFirstItalicSentenceNode(), 26);
        range.setEnd(TestPageHelper.getLastParagraphSentenceNode(), 30);
    }

    static setRangeContainerForSentence(range) {
        TestPageHelper.setRangeContainer(range, TestPageHelper.getFirstSentenceNode());
    }

    static setRangeContainer(range, sentenceElem) {
        range.setStart(sentenceElem);
        range.setEnd(sentenceElem);
    }

    static getFirstSentenceNode () {
        return document.querySelector('.article--paragraph--sentence');
    }

    static setRangeContainerForSentenceItalic(range) {
        TestPageHelper.setRangeContainer(range, TestPageHelper.getFirstItalicSentenceNode());
    }
}
