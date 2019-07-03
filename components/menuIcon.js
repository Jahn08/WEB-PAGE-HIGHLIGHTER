class MenuIcon {
    constructor(iconName) {
        this._iconName = iconName;
    }

    getSettings() {
        const iconFullPath = this._getFullPathToFile();

        return iconFullPath ? {
            [MenuIcon.STANDARD_DENSITY]: iconFullPath,
            [MenuIcon.HIGH_DENSITY]: iconFullPath
        } : null;
    }

    get relativeFilePath() {
        return this._getFullPathToFile() || '';
    }

    _getFullPathToFile() {
        if (!this._iconName)
            return null;

        const _fileNameStr = '' + this._iconName;
        const extension = _fileNameStr.indexOf('.') === -1 ? '.svg' : '';
        return 'icons/' + _fileNameStr + extension;
    }

    static get STANDARD_DENSITY() { return 16; }

    static get HIGH_DENSITY() { return 32; }
}

export { MenuIcon };
