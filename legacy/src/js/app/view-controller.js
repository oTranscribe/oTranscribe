import {showSettings} from './settings/settings.jsx';
const $ = (sel) => document.querySelector(sel);

let currentView = 'about';

const views = {
    about: () => {
        $('.title').classList.add('active');
        $('.about').classList.add('active');
    },
    editor: () => {
        $('.textbox-container').style.display = 'block';
    },
    settings: () => {
        $('.settings-button').classList.add('active');
        $('.settings-panel').classList.add('active');
        $('.settings-panel').innerHTML = '';
        showSettings($('.settings-panel'));
    }
}

const hideAllViews = () => {
    $('.title').classList.remove('active');
    $('.about').classList.remove('active');
    $('.settings-button').classList.remove('active');
    $('.settings-panel').classList.remove('active');
    $('.textbox-container').style.display = 'none';
}

const validate = (name) => {
    if ((name in views) === false) {
        throw(name + ' is not a valid view');   
    }
}

export default {
    get: () => currentView,
    set: (name) => {
        validate(name);
        
        hideAllViews();
        views[name]();    
        
        currentView = name;
        return currentView;
    },
    is: (name) => {
        validate(name);
        return (name === currentView);
    }
};
