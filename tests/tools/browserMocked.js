import { Randomiser } from '../tools/randomiser.js';
import { StorageMocked } from '../tools/storageMocked.js';
import fs from 'fs';

export class BrowserMocked {
    constructor() {
        global.browser = {};
        this._initLocaleApi();

        this._initRuntime();
        this._onMessageCallback = null;

        this._menuOptions = [];

        this._tabQueries = [];
        this._tabMessages = {};
        this._runtimeMessages = [];

        this._onClickCallback = null;
    }

    static get _localeMessages() {
        if (!this._messages)
            this._messages = JSON.parse(fs.readFileSync('./_locales/en/messages.json')
                .toString('utf8'));
        
        return this._messages;
    }

    _initLocaleApi() {
        global.browser.i18n = {
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
        };
    }

    
    _initRuntime() {
        global.browser.runtime = {
            logLastError: () => {},
            sendMessage: () => Promise.resolve()
        };
    }

    resetRuntime(sendMessageResultGetter = null) {
        this._runtimeMessages = [];
        global.browser.runtime = {
            sendMessage: (_, msgBody) => new Promise((resolve, reject) => {
                try {
                    this._runtimeMessages.push(msgBody);
                    resolve(sendMessageResultGetter ? sendMessageResultGetter(): null);
                } catch(ex) {
                    reject(ex);
                }
            }),
            onMessage: {
                addListener: (callback) => { 
                    this._onMessageCallback = callback;
                }
            }
        };
    }

    callRuntimeOnMessageCallback(msg) {
        if(this._onMessageCallback)
            return this._onMessageCallback(msg);

        return Promise.resolve();
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
            create: (options, callback) => { 
                this._menuOptions.push(options);
                callback();
            },
            update: (id, options) => Object.assign(this._menuOptions.find(i => i.id === id), options),
            remove: (id) => {
                this._menuOptions = this._menuOptions.filter(i => i.id !== id && i.parentId !== id);
                return Promise.resolve();
            },
            onClicked: {
                addListener: (callback) => this._onClickCallback = callback
            }
        };
    }

    async dispatchMenuClick(id) {
        if(!this._onClickCallback)
            return;

        const menuOption = this._menuOptions.find(i => i.id === id) || {};
        if (menuOption)
            await this._onClickCallback({ menuItemId: id, parentMenuItemId: menuOption.parentId });
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

    getRuntimeMessages() { 
        return this._runtimeMessages;
    }
}
