(async () => {
    const contentMain = await import('./highlighter.js'); 
    new contentMain.Highlighter();
})();
