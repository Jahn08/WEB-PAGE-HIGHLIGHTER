(async () => {
    const contentMain = await import('./highlighter.js'); 
    const highlighter = new contentMain.Highlighter();
    await highlighter.initPreferences();
})();
