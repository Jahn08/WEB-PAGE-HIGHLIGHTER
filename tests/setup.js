import { EnvLoader } from './tools/envLoader.js';

before(done => {
    EnvLoader.defineWindow();
    done();
});
