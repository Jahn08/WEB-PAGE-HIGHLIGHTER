import { Preferences } from '../components/preferences.js';

const preferences = new Preferences();

preferences.load();

document.forms[0].addEventListener('submit', () => preferences.save());
