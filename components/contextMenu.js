import { ButtonMenuItem, SeparatorMenuItem, RadioSubMenuItem } from './menuItem.js';

export class ContextMenu {
    constructor ()
    {
        this.onMarking = null;
        this.onUnmarking = null;
        
        new SeparatorMenuItem().addToMenu();
    
        const markBtn = new ButtonMenuItem('mark', 'Mark selected text');
        const unmarkBtn = new ButtonMenuItem('unmark', 'Unmark selected text');

        const getCurrentTabId = async () => {
            const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });
    
            if (!activeTabs || !activeTabs.length)
                throw new Error('No active tab was obtained');
    
            return activeTabs[0].id;
        };
    
        let curColourClass = 'greenMarker';

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

        new RadioSubMenuItem('green', setColourBtn.getId(), 'Green').addToMenu(null, null, true);
        new RadioSubMenuItem('red', setColourBtn.getId(), 'Red').addToMenu();
        new RadioSubMenuItem('pink', setColourBtn.getId(), 'Pink').addToMenu();
        new RadioSubMenuItem('orange', setColourBtn.getId(), 'Orange').addToMenu();
        new RadioSubMenuItem('yellow', setColourBtn.getId(), 'Yellow').addToMenu();
        new RadioSubMenuItem('blue', setColourBtn.getId(), 'Blue').addToMenu();
    }
};
