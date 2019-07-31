import { Randomiser } from '../tools/randomiser.js';
import { StorageMocked } from '../tools/storageMocked.js';

export class BrowserMocked {
    constructor() {
        global.browser = {};
        
        this._menuOptions = [];

        this._tabQueries = [];
    }

    resetBrowserStorage() {
        const syncStorage = { 
            sync: new StorageMocked() 
        };
        global.browser.storage = syncStorage;
        
        return syncStorage.sync;
    }

    setBrowserMenu() {
        const eventListener = { 
            addListener() { }
        };

        global.browser.contextMenus = {
            create: options => this._menuOptions.push(options),
            update: (id, options) => Object.assign(this._menuOptions.find(i => i.id === id), options),
            onShown: eventListener,
            onHidden: eventListener,
            remove: (id) => {
                this._menuOptions = this._menuOptions.filter(i => i.id !== id);
            }
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
