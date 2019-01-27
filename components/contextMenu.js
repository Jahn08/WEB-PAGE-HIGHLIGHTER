import { ButtonMenuItem, SeparatorMenuItem, RadioSubMenuItem } from './menuItem.js';

export class ContextMenu {
    constructor ()
    {
        new SeparatorMenuItem().addToMenu();
    
        const markBtn = new ButtonMenuItem('mark', 'Mark selected text');
        const unmarkBtn = new ButtonMenuItem('unmark', 'Unmark selected text');

        const getCurrentTabId = async () => {
            const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });
    
            if (!activeTabs || !activeTabs.length)
                throw new Error('No active tab was obtained');
    
            return activeTabs[0].id;
        };
    
        const defaultColourClass = 'greenMarker';
        let curColourClass = defaultColourClass;

        this.onMarking = null;
        markBtn.addToSelectionMenu(async () => {
            try {
                if (!this.onMarking)
                    return;

                const tabId = await getCurrentTabId();
                await this.onMarking({ tabId, colourClass: curColourClass });
            }
            catch (ex) {
                console.error('Error while trying to mark: ' + ex.toString());
            }
        });
    
        this.onUnmarking = null;
        unmarkBtn.addToMenu(async () => { 
            try {
                if (!this.onUnmarking)
                    return;

                const tabId = await getCurrentTabId();
                await this.onUnmarking({ tabId });
            }
            catch (ex) {
                console.error('Error while trying to unmark: ' + ex.toString());
            }
        });
    
        unmarkBtn.hide();
    
        this.makeReadyForMarking = () => {
            unmarkBtn.hide();
            markBtn.show();
        };

        this.makeReadyForUnmarking = () => {
            markBtn.hide();
            unmarkBtn.show();
        };

        new SeparatorMenuItem().addToMenu();
        
        const setColourBtn = new ButtonMenuItem('palette', 'Set mark colour');
        setColourBtn.addToMenu();

        this.onChangingColour = null;
        const changeColour = async (info) => {
            try {
                curColourClass = info.menuItemId;

                if (!this.onChangingColour)
                    return;

                const tabId = await getCurrentTabId();
                await this.onChangingColour({ tabId, colourClass: curColourClass });
            }
            catch (ex) {
                console.error('Error while trying to change mark colour: ' + ex.toString());
            }
        };

        new RadioSubMenuItem(defaultColourClass, setColourBtn.getId(), 'Green')
            .addToMenu(changeColour, null, true);
        new RadioSubMenuItem('redMarker', setColourBtn.getId(), 'Red').addToMenu(changeColour);
        new RadioSubMenuItem('pinkMarker', setColourBtn.getId(), 'Pink').addToMenu(changeColour);
        new RadioSubMenuItem('orangeMarker', setColourBtn.getId(), 'Orange').addToMenu(changeColour);
        new RadioSubMenuItem('yellowMarker', setColourBtn.getId(), 'Yellow').addToMenu(changeColour);
        new RadioSubMenuItem('blueMarker', setColourBtn.getId(), 'Blue').addToMenu(changeColour);
    }
};
