import { MenuIcon } from './menuIcon.js';

export class ColourList {
    static _buildColourOption(colourName) {
        return { 
            token: 'marker-' + colourName,
            icon: new MenuIcon(colourName),
            title: colourName[0].toUpperCase() + colourName.substr(1).toLowerCase()
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
