import { MessageSender } from '../components/messageSender.js';
import { PageLocalisation } from '../components/pageLocalisation.js';

class Popup {
    static initialise() {
        if (Popup._initialised)
            return;

        this._browser = new BrowserAPI();

        PageLocalisation.setLocaleStrings(this._browser.locale);

        for (const item of document.getElementsByClassName('panel-list-item'))
            item.addEventListener('click', Popup._clickCallback);

        Popup._callOnActiveTab(tab => {
            Popup._browser.tabs.sendMessage(tab.id, MessageSender.startLoadingTabState())
                .then(msg => {
                    const sender = new MessageSender(msg);

                    let sectionIsVisible = false;

                    if (sender.shouldSetLoadMenuReady()) {
                        Popup._showControl(Popup._getControl('loading'));
                        sectionIsVisible = true;
                    }

                    if (sender.shouldSetSaveMenuReady()) {
                        Popup._showControl(Popup._getControl('saving'));
                        sectionIsVisible = true;
                    }

                    if (sectionIsVisible)
                        Popup._showControl(Popup._getControl('separator'));

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
                        Popup._browser.tabs.sendMessage(tab.id, MessageSender.startSaving()));
                    break;
                case 'tabs-loading':
                    await Popup._callOnActiveTab(tab => 
                        Popup._browser.tabs.sendMessage(tab.id, MessageSender.startLoading()));
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
}

Popup.initialise();
