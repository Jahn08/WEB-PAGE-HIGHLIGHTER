import { EnvLoader } from './tools/envLoader.js';

before(done => {
    EnvLoader.defineWindow();

    EnvLoader.loadClass('./content_scripts/browserStorage.js', 'BrowserStorage')
        .then(() => done())
        .catch(done);
});
