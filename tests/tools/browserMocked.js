import { Randomiser } from '../tools/randomiser.js';
import { StorageMocked } from '../tools/storageMocked.js';
import fs from 'fs';

export class BrowserMocked {
    constructor() {
        global.browser = {};
        
        this._initLocaleApi();

        this._menuOptions = [];

        this._tabQueries = [];
        this._tabMessages = {};
    }

    static get _localeMessages() {
        if (!this._messages)
            this._messages = JSON.parse(fs.readFileSync('./_locales/en/messages.json')
                .toString('utf8'));
        
        return this._messages;
    }

    _initLocaleApi() {
        global.browser = {
            i18n: {
                getMessage(name) {
                    const msg = BrowserMocked._localeMessages[name];
                    const argLength = arguments.length;

                    if (!msg)
                        return '';

                    let msgContent = msg.message;

                    if (argLength > 1) {
                        const searchPattern = /\$\w+\$/gi;

                        for (let i = 1; i < argLength; ++i) {
                            const arg = arguments[i];

                            if (arg != null)
                                msgContent = msgContent.replace(searchPattern, arg);
                        }
                    }

                    return msgContent;
                }
            },
            runtime: {
                logLastError: () => {}
            }
        };
    }

    resetBrowserStorage() {
        let syncStorage;

        if (global.browser.storage) {
            syncStorage = global.browser.storage;
            syncStorage.local.clear();
        } else {
            syncStorage = { 
                local: new StorageMocked() 
            };
            global.browser.storage = syncStorage;
        }

        return syncStorage.local;
    }

    setBrowserMenu() {
        global.browser.contextMenus = {
            create: options => this._menuOptions.push(options),
            update: (id, options) => Object.assign(this._menuOptions.find(i => i.id === id), options),
            remove: (id) => {
                this._menuOptions = this._menuOptions.filter(i => i.id !== id);
            }
        };
    }

    dispatchMenuClick(id) {
        const clickFn = (this._menuOptions.find(i => i.id === id) || {}).onclick;

        if (clickFn)
            clickFn({ menuItemId: id });
    }

    get menuOptions() { return this._menuOptions; }

    setBrowserTab(sendMessageOutcome = {}) {
        global.browser.tabs = {
            query: body => {
                return new Promise((resolve, reject) => {
                    if (!body)
                        return reject(new Error('The query to browser tabs is empty'));

                    this._tabQueries.push(body);
                    resolve([{ id: Randomiser.getRandomNumberUpToMax() }]); 
                });
            },
            sendMessage: (tabId, msgBody) => {
                return new Promise((resolve) => {
                    const msgs = this._tabMessages[tabId] || [];
                    msgs.push(msgBody);

                    this._tabMessages[tabId] = msgs;
                    resolve(sendMessageOutcome);
                });
            }
        };
    }

    get tabQueries() { return this._tabQueries; }

    getTabMessages(tabId) { 
        return this._tabMessages[tabId];
    }
}
