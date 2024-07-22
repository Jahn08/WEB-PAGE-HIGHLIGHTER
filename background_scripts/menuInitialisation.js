import { ContextMenu } from '../components/contextMenu.js';
import { Preferences } from '../components/preferences.js';
import { BrowserAPI } from '../content_scripts/browserAPI.js';
import { CategoryView, PageInfo } from '../content_scripts/pageInfo.js';
import { SenderMessage } from '../components/senderMessage.js';

const gBrowserApi = new BrowserAPI();
gBrowserApi.runtime.onInstalled(async () => {
    const contextMenu = new ContextMenu();
    contextMenu.render();
    
    // TODO: render page categories when installed/updated and only after changing preferences
    const categories = await PageInfo.getAllSavedCategories();
    const categoryView = new CategoryView(categories);
    contextMenu.renderPageCategories(categoryView.categoryTitles, categoryView.defaultCategoryTitle);
});

gBrowserApi.runtime.onMessage(async msg => {
    try {
        const senderMsg = new SenderMessage(msg);
        const contextMenu = new ContextMenu();
    
        if (senderMsg.shouldLoadPreferences()) {
            const preferences = (await Preferences.loadFromStorage()) || {};
            preferences.defaultColourToken = contextMenu.checkColourRadio(preferences.defaultColourToken);
            contextMenu.renderShortcuts(preferences.shortcuts);

            return preferences;
        }

        if (senderMsg.shouldUpdateShortcuts())
            contextMenu.renderShortcuts(senderMsg.shortcuts);

        if (senderMsg.shouldSetSaveMenuReady())
            contextMenu.enableSaveBtn();
        else
            contextMenu.disableSaveBtn();

        if (senderMsg.shouldSetLoadMenuReady())
            contextMenu.enableLoadBtn();
        else
            contextMenu.disableLoadBtn();

        if (senderMsg.shouldSetMarkMenuReady())
            contextMenu.enableMarkingBtn();
        else
            contextMenu.disableMarkingBtn();
        
        if (senderMsg.shouldSetUnmarkMenuReady())
            contextMenu.enableUnmarkingBtn();
        else
            contextMenu.disableUnmarkingBtn();

        if (senderMsg.shouldSetAddNoteMenuReady())
            contextMenu.enableAddingNoteBtn();
        else
            contextMenu.disableAddingNoteBtn();

        if (senderMsg.shouldSetRemoveNoteMenuReady())
            contextMenu.enableRemovingNoteBtn();
        else
            contextMenu.disableRemovingNoteBtn();
            
        if (senderMsg.shouldEmitEvent()) {
            contextMenu.emitItemClick(senderMsg.eventName);
            return true;
        }

        if (senderMsg.shouldAddNoteLinks())
            contextMenu.renderNoteLinks(senderMsg.noteLinks);

        return true;
    } catch (ex) {
        console.error('Error while trying to set menu visibility: ' + ex.toString());
        throw ex;
    }
});
