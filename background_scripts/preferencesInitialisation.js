import { Preferences } from '../components/preferences.js';

const preferences = new Preferences();
preferences.load().then(() => {
    document.querySelector('button[type=submit]').disabled = undefined;
    
    document.forms[0].addEventListener('submit', _event => {
        preferences.save();
        _event.preventDefault();
    });
});
