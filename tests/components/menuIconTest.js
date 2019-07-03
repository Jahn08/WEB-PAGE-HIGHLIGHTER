import assert from 'assert';

import { Randomiser } from '../tools/randomiser';
import { MenuIcon } from '../../components/menuIcon';

describe('MenuIcon', () => {

    const compileFullFileName = (fileName) => `${fileName}.svg`;

    describe('#getSettings', () => {
        it('should build MenuIcon with empty icon settings', () =>
            assert.strictEqual(new MenuIcon().getSettings(), null));
        
        it('should build MenuIcon with both 16 and 32-pixel icons', () => {
            const iconName = Randomiser.getRandomNumber(100);
            const menuIcon = new MenuIcon(iconName);

            const settings = menuIcon.getSettings();
            assert.strictEqual(Object.getOwnPropertyNames(settings).length, 2);
            assert(settings[MenuIcon.STANDARD_DENSITY].endsWith(compileFullFileName(iconName)));
            assert(settings[MenuIcon.HIGH_DENSITY].endsWith(compileFullFileName(iconName)));
        });
    });
});
