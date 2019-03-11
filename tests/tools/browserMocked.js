export class BrowserMocked {
    constructor() {
        global.browser = {};

        this._options = [];
    }

    setBrowserMenu() {
        global.browser.menus = {
            create: options => this._options.push(options),
            update: (id, options) => Object.assign(this._options.find(i => i.id === id), options)
        };
    }

    get options() { return this._options.slice(); }
}
