import { Randomiser } from '../tools/randomiser';

export class BrowserMocked {
    constructor() {
        global.browser = {};

        this._menuOptions = [];

        this._tabQueries = [];
    }

    setBrowserMenu() {
        global.browser.menus = {
            create: options => this._menuOptions.push(options),
            update: (id, options) => Object.assign(this._menuOptions.find(i => i.id === id), options)
        };
    }

    get menuOptions() { return this._menuOptions; }

    setBrowserTab() {
        global.browser.tabs = {
            query: body => {
                return new Promise((resolve, reject) => {
                    if (!body)
                        return reject(new Error('The query to browser tabs is empty'));

                    this._tabQueries.push(body);
                    resolve([{ id: Randomiser.getRandomNumberUpToMax() }]); 
                });
            }
        };
    }

    get tabQueries() { return this._tabQueries; }
}
