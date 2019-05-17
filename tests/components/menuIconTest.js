import assert from 'assert';

import { Randomiser } from '../tools/randomiser';
import { MenuIcon } from '../../components/menuIcon';

describe('MenuIcon', () => {
    describe('#constructor', () => {
        it('should build MenuIcon with empty icon settings', () =>
            assert.strictEqual(new MenuIcon().getSettings().length, 0));
        
        it('should build MenuIcon with a passed argument and only a 16-pixel icon', () => {
            const fileName = Randomiser.getRandomNumberUpToMax();
            const settings = new MenuIcon(fileName).getSettings();

            assert.strictEqual(settings.length, 1);
            assert(settings[0][32] === undefined);
            assert(settings[0][16].endsWith(fileName));
        });
    });

    describe('#addHighDensityIcon', () => {
        it('should add a 32-pixel icon', () => {
            const icon16FileName = Randomiser.getRandomNumberUpToMax();
            const menuIcon = new MenuIcon(icon16FileName);

            const icon32FileName = Randomiser.getRandomNumberUpToMax();
            menuIcon.addHighDensityIcon(icon32FileName);

            const settings = menuIcon.getSettings();
            assert.strictEqual(settings.length, 2);
            assert(settings[0][32] === undefined && settings[0][16].endsWith(icon16FileName));
            assert(settings[1][16] === undefined && settings[1][32].endsWith(icon32FileName));
        });
    });
});
