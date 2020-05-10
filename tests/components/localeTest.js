import assert from 'assert';
import fs from 'fs';
import { EnvLoader } from '../tools/envLoader.js';
import { Expectation } from '../tools/expectation.js';

describe('components/locale', function () {

    afterEach('releaseResources', () => {        
        EnvLoader.unloadDomModel();
    });

    const getLocale = language => JSON.parse(
        fs.readFileSync(`./_locales/${language}/messages.json`).toString('utf8'));

    const EN_LOCALE = getLocale('en');
    const RU_LOCALE = getLocale('ru');

    it('should assure that all the locales have equal keys', () =>
        assert.deepStrictEqual(Object.getOwnPropertyNames(EN_LOCALE).sort(), 
            Object.getOwnPropertyNames(RU_LOCALE).sort())
    );

    it('should assure that all the keys of the locales have no dashes', () =>
        assert(Object.getOwnPropertyNames(EN_LOCALE).concat(Object.getOwnPropertyNames(RU_LOCALE))
            .every(prop => !prop.includes('-')))
    );

    it('should assure that all the keys of the locales have the message property', () => {
        const localeKeys = Object.getOwnPropertyNames(EN_LOCALE);
        assert(localeKeys.every(prop => EN_LOCALE[prop].message));
        assert(localeKeys.every(prop => RU_LOCALE[prop].message));
    });

    const testLocaleSymbols = (locale, wrongSymbolsExp) => {
        const paramSubstitutionExp = /\$\w*\$|highbrighter|shift|ctrl|printscreen/gmi;

        Object.getOwnPropertyNames(locale).map(prop => {
            const msg = locale[prop].message;
            return msg.replace(paramSubstitutionExp, '');
        }).forEach(msg => 
            assert(!wrongSymbolsExp.test(msg), `Message '${msg}' contains incorrect symbols`));
    };

    it('should assure that the English locale has messages only in English', () =>
        testLocaleSymbols(EN_LOCALE, /[^a-z0-9-\s:.,'$/]/gmi)
    );

    it('should assure that the Russian locale has messages only in Russian', () =>
        testLocaleSymbols(RU_LOCALE, /[^а-яё0-9-\s:.,'$/]/gmi)
    );

    const testViewLocalisation = viewName => 
        Expectation.expectResolution(EnvLoader.loadDomModel(`./views/${viewName}.html`), 
            () => {
                const dashExp = /-/gm;

                [...document.getElementsByClassName('locale')].forEach(el => {
                    const msgName = (el.name || el.id).replace(dashExp, '_');
                    assert(EN_LOCALE[msgName], `A message with a key '${msgName}' is not found`);
                });
            });

    it('should assure that the labels of the preferences page are localised', () =>
        testViewLocalisation('preferences')
    );

    it('should assure that the labels of the popup page are localised', () =>
        testViewLocalisation('popup')
    );
});
