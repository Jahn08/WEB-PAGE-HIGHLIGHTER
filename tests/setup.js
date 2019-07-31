import { EnvLoader } from './tools/envLoader.js';

before(done => {
    EnvLoader.loadClass('./content_scripts/browserAPI.js', 'BrowserAPI')
        .then(() => Promise.all([
            EnvLoader.loadClass('./content_scripts/browserStorage.js', 'BrowserStorage'), 
            EnvLoader.loadClass('./content_scripts/arrayExtension.js', 'ArrayExtension')])
            .then(() => done()))
        .catch(done);
});
