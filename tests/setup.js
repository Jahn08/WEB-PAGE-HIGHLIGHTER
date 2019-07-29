import { EnvLoader } from './tools/envLoader.js';

before(done => {
    EnvLoader.loadClass('./content_scripts/browserStorage.js', 'BrowserStorage')
        .then(() => EnvLoader.loadClass('./content_scripts/arrayExtension.js', 'ArrayExtension')
            .then(() => done()))
        .catch(done);
});
