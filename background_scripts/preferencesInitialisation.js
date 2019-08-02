import { Preferences } from '../components/preferences.js';

const preferences = new Preferences();
preferences.load().then(() => {
    document.getElementById('form--btn-submit').disabled = undefined;
    
    document.forms[0].addEventListener('submit', _event => {
        preferences.save().then(() => location.reload());
        
        _event.preventDefault();
    });

    preferences.initialiseExport();
});
