export class PageLocalisation {
    static setLocaleStrings(localeApi) {
        if (!localeApi)
            return;

        const elems = [...document.getElementsByClassName(this.LOCALE_CLASS_NAME)];
        const length = elems.length;

        const localeAttrName = this._LOCALE_ATTR_NAME;

        for (let i = 0; i < length; ++i) {
            const el = elems[i];

            let str;

            const msgName = el.name || el.id;

            if (msgName && (str = localeApi.getString(msgName))) {
                const attrName = el.dataset[localeAttrName] || 'innerHTML';
                el[attrName] = str;

                let addAttr;

                if ((addAttr = el.dataset.localeAddAttr))
                    el[addAttr] = localeApi.getString(`${msgName}-${addAttr}`) || str;
            }
        }
    }

    static get LOCALE_CLASS_NAME() { return 'locale'; }

    static get _LOCALE_ATTR_NAME() { return 'localeAttr'; }

    static prepareLabelLocale(elem, elemId) {
        elem.dataset[this._LOCALE_ATTR_NAME] = 'label';
        
        return this.prepareElemLocale(elem, elemId);
    }

    static prepareElemLocale(elem, elemId) {
        elem.id = elemId;
        elem.className = this.LOCALE_CLASS_NAME;

        return elem;
    }
}
