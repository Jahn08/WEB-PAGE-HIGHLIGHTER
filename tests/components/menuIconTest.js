import assert from 'assert';

import { Randomiser } from '../tools/randomiser';
import { MenuIcon } from '../../components/menuIcon';

describe('MenuIcon', () => {

    const compileFullFileName = (fileName, isHighDensity = false) => 
        `${fileName}${isHighDensity ? MenuIcon.HIGH_DENSITY : MenuIcon.STANDARD_DENSITY}.png`;

    describe('#getSettings', () => {
        it('should build MenuIcon with empty icon settings', () =>
            assert.strictEqual(new MenuIcon().getSettings(), null));
        
        it('should build MenuIcon with a passed argument and only a 16-pixel icon', () => {
            const fileName = Randomiser.getRandomNumber(100);
            
            const settings = new MenuIcon(fileName).getSettings();

            assert.strictEqual(Object.getOwnPropertyNames(settings).length, 1);
            assert(settings[MenuIcon.HIGH_DENSITY] === undefined);
            
            assert(settings[MenuIcon.STANDARD_DENSITY].endsWith(compileFullFileName(fileName)));
        });

        it('should build MenuIcon with both 16 and 32-pixel icons', () => {
            const icon16FileName = Randomiser.getRandomNumber(100);
            const icon32FileName = Randomiser.getRandomNumber(100);
            const menuIcon = new MenuIcon(icon16FileName, icon32FileName);

            const settings = menuIcon.getSettings();
            assert.strictEqual(Object.getOwnPropertyNames(settings).length, 2);
            assert(settings[MenuIcon.STANDARD_DENSITY].endsWith(compileFullFileName(icon16FileName)));
            assert(settings[MenuIcon.HIGH_DENSITY].endsWith(compileFullFileName(icon32FileName, true)));
        });
    });
});
