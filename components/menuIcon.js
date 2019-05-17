class MenuIcon {
    constructor(iconFileName) {
        this._standardIconFileName = iconFileName;
        this._highDensityIconFileName = null;
    }

    addHighDensityIcon(fileName) {
        this._highDensityIconFileName = fileName;
    }

    getSettings() {
        const icons = [];

        if (this._standardIconFileName)
            icons.push({ "16" : this._getFullPathToFile(this._standardIconFileName) });

        if (this._highDensityIconFileName)
            icons.push({ "32" : this._getFullPathToFile(this._highDensityIconFileName) });

        return icons;
    }

    _getFullPathToFile(fileName) {
        return 'icons/' + fileName;
    }
}

export { MenuIcon };
