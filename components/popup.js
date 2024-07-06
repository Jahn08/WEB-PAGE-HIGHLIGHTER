import { SenderMessage } from './senderMessage.js';
import { PageLocalisation } from './pageLocalisation.js';
import { Preferences } from './preferences.js';

class Popup {
    static initialise() {
        if (Popup._initialised)
            return;

        this._loadShortcuts();

        this._browser = new BrowserAPI();

        PageLocalisation.setLocaleStrings(this._browser.locale);

        for (const item of document.getElementsByClassName('panel-list-item'))
            item.addEventListener('click', Popup._clickCallback);

        Popup._callOnActiveTab(tab => {
            Popup._browser.tabs.sendMessage(tab.id, SenderMessage.startLoadingTabState())
                .then(msg => {
                    const senderMsg = new SenderMessage(msg);

                    let sectionIsVisible = false;

                    if (senderMsg.shouldSetLoadMenuReady()) {
                        Popup._showControl(Popup._getControl('loading'));
                        sectionIsVisible = true;
                    }

                    if (senderMsg.shouldSetSaveMenuReady()) {
                        Popup._showControl(Popup._getControl('saving'));
                        sectionIsVisible = true;
                    }

                    if (sectionIsVisible) {
                        Popup._showControl(Popup._getControl('separator'));

                        if (senderMsg.shouldUpdateShortcuts())
                            this._updateShortcuts(senderMsg.shortcuts);
                    }

                    Popup._browser.runtime.logLastError('An error while trying to get button states');
                });
        });

        Popup._initialised = true;
    }

    static _showControl(ctrl) {
        const hiddenClassName = 'hidden';

        if (!ctrl || !ctrl.classList.contains(hiddenClassName))
            return;			
		
        ctrl.classList.remove(hiddenClassName);
    }

    static _getControl(token) {
        return document.getElementById('tabs-' + token);
    }

    static _callOnActiveTab(callback) {
        Popup._getCurrentWindowTabs().then(tabs => {
            return callback(tabs[0]);
        });
    }
	
    static _getCurrentWindowTabs() {
        return Popup._browser.tabs.getActiveTabs();
    }

    static async _clickCallback (e) {
        const actionId = e.currentTarget.id;
        const msgPrefix = `An error occured while performing an action '${actionId}'`;

        try {
            switch(actionId) {
                case 'tabs-saving':
                    await Popup._callOnActiveTab(tab => 
                        Popup._browser.tabs.sendMessage(tab.id, SenderMessage.startSaving()));
                    break;
                case 'tabs-loading':
                    await Popup._callOnActiveTab(tab => 
                        Popup._browser.tabs.sendMessage(tab.id, SenderMessage.startLoading()));
                    break;
                case 'tabs-preferences':
                    await Popup._browser.runtime.openOptionsPage();
                    break;
                default:
                    return;
            }
            
            Popup._browser.runtime.logLastError(msgPrefix);
            window.close();
        }
        catch (ex) {
            console.error(`${msgPrefix}: ${ex.toString()}`);
        }
    }

    static async _loadShortcuts() {
        const preferences = (await Preferences.loadFromStorage()) || {};
        this._updateShortcuts(preferences.shortcuts);
    }

    static _updateShortcuts(shortcuts) {
        if (!shortcuts)
            return;

        const storageOptions = OptionList.storage;

        this._setShortcut(shortcuts, storageOptions.save);
        this._setShortcut(shortcuts, storageOptions.load);
    }

    static _setShortcut(shortcuts, cmdId) {
        const shortcut = (shortcuts[cmdId] || {}).key;

        let menuItemEl;
        let shortcutEl;

        if (shortcut && (menuItemEl = document.getElementById(cmdId)) && 
            (shortcutEl = menuItemEl.nextElementSibling))
            shortcutEl.innerHTML = shortcut;
    }
}

Popup.initialise();
