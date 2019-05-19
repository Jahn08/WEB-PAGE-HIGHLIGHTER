class MenuIcon {
    constructor(stDensityIcon, highDensityIcon = null) {
        this._standardIconFileName = stDensityIcon;
        this._highDensityIconFileName = highDensityIcon;
    }

    getSettings() {
        const icons = {};

        if (this._standardIconFileName)
            icons[MenuIcon.STANDARD_DENSITY] = this._getFullPathToFile(this._standardIconFileName);

        if (this._highDensityIconFileName)
            icons[MenuIcon.HIGH_DENSITY] = this._getFullPathToFile(this._highDensityIconFileName, true);

        return Object.getOwnPropertyNames(icons).length ? icons : null;
    }

    _getFullPathToFile(fileName, isHighDensity = false) {
        const _fileNameStr = '' + fileName;
        const extension = _fileNameStr.indexOf('.') === -1 ? '.png' : '';
        const density = isHighDensity ? MenuIcon.HIGH_DENSITY : MenuIcon.STANDARD_DENSITY;
        return 'icons/' + _fileNameStr + density + extension;
    }

    static get STANDARD_DENSITY() { return 16; }

    static get HIGH_DENSITY() { return 32; }
}

export { MenuIcon };
