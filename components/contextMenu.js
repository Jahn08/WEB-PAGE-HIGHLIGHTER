import { ButtonMenuItem, SeparatorMenuItem, RadioSubMenuItem } from './menuItem.js';

export class ContextMenu {
    constructor() {
        this.onMarking = null;
        this.onUnmarking = null;
        this.onChangingColour = null;

        new SeparatorMenuItem().addToMenu();
    
        this._markBtn = new ButtonMenuItem('mark', 'Mark selected text');
        this._unmarkBtn = new ButtonMenuItem('unmark', 'Unmark selected text');

        const defaultColourClass = 'greenMarker';
        let curColourClass = defaultColourClass;

        this._markBtn.addToSelectionMenu(async () => {
            try {
                if (!this.onMarking)
                    return;

                const tabId = await this._getCurrentTabId();
                await this.onMarking({ tabId, colourClass: curColourClass });
            }
            catch (ex) {
                console.error('Error while trying to mark: ' + ex.toString());
            }
        });
    
        this._unmarkBtn.addToMenu(async () => { 
            try {
                if (!this.onUnmarking)
                    return;

                const tabId = await this._getCurrentTabId();
                await this.onUnmarking({ tabId });
            }
            catch (ex) {
                console.error('Error while trying to unmark: ' + ex.toString());
            }
        });
    
        this._unmarkBtn.hide();
        
        const changeColour = async (info) => {
            try {
                curColourClass = info.menuItemId;

                if (!this.onChangingColour)
                    return;

                const tabId = await this._getCurrentTabId();
                await this.onChangingColour({ tabId, colourClass: curColourClass });
            }
            catch (ex) {
                console.error('Error while trying to change mark colour: ' + ex.toString());
            }
        };

        new SeparatorMenuItem().addToMenu();

        const setColourBtn = new ButtonMenuItem('palette', 'Set mark colour');
        setColourBtn.addToMenu();

        new RadioSubMenuItem(defaultColourClass, setColourBtn.id, 'Green')
            .addToMenu(changeColour, null, true);
        new RadioSubMenuItem('redMarker', setColourBtn.id, 'Red').addToMenu(changeColour);
        new RadioSubMenuItem('pinkMarker', setColourBtn.id, 'Pink').addToMenu(changeColour);
        new RadioSubMenuItem('orangeMarker', setColourBtn.id, 'Orange').addToMenu(changeColour);
        new RadioSubMenuItem('yellowMarker', setColourBtn.id, 'Yellow').addToMenu(changeColour);
        new RadioSubMenuItem('blueMarker', setColourBtn.id, 'Blue').addToMenu(changeColour);
    }

    makeReadyForMarking() {
        this._unmarkBtn.hide();
        this._markBtn.show();
    }

    makeReadyForUnmarking() {
        this._markBtn.hide();
        this._unmarkBtn.show();
    }

    async _getCurrentTabId() {
        const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });

        if (!activeTabs || !activeTabs.length)
            throw new Error('No active tab was obtained');

        return activeTabs[0].id;
    }
};
