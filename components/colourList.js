import { MenuIcon } from './menuIcon.js';

export class ColourList {
    static _buildColourOption(colourToken) {
        return { 
            token: colourToken,
            icon: new MenuIcon(colourToken),
            title: colourToken[0].toUpperCase() + colourToken.substr(1).toLowerCase(),
            className: 'marker-' + colourToken
        };
    }

    static get colours() {
        return [
            ColourList._buildColourOption('green'),
            ColourList._buildColourOption('red'),
            ColourList._buildColourOption('pink'),
            ColourList._buildColourOption('orange'),
            ColourList._buildColourOption('yellow'),
            ColourList._buildColourOption('blue')
        ];
    }
}
