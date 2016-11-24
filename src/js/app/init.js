/******************************************
             Initialisation
******************************************/

const $ = require('jquery');

import { watchFormatting, watchWordCount, toggleAbout } from './texteditor';
import inputSetup from './input';
import oldBrowserCheck from './old-browsers';
import languageSetup from './languages';
import { createPlayer, playerDrivers, getPlayer } from './player/player';
import { bindPlayerToUI, keyboardShortcutSetup } from './ui';
import { activateTimestamps, insertTimestamp } from './timestamps';
import { initBackup } from './backup';
import { exportSetup } from './export';
import importSetup from './import';

export default function init(){
    initBackup();
    watchWordCount();
    watchFormatting();
    languageSetup();
    activateTimestamps();
    exportSetup();
    importSetup();

    // this is necessary due to execCommand restrictions
    // see: http://stackoverflow.com/a/33321235
    window.insertTimestamp = insertTimestamp;
    
    keyboardShortcutSetup();

    if ( localStorageManager.getItem("lastfile") ) {
        toggleAbout();
    }
    $('.title').mousedown(toggleAbout);
}

// note: this function may run multiple times
function onLocalized() {
    const resetInput = inputSetup({
        create: file => {
		    createPlayer({
		        driver: playerDrivers.HTML5_AUDIO,
		        source: window.URL.createObjectURL(file),
                name: file.name
		    }).then(() => {
                bindPlayerToUI(file.name);
		    });
        },
        createFromURL: url => {
		    createPlayer({
		        driver: playerDrivers.YOUTUBE,
		        source: url
		    }).then(() => {
                bindPlayerToUI();
		    });
        }
    });
    
    var startText = document.webL10n.get('start-ready');
    $('.start')
        .addClass('ready')
        .off()
        .click(toggleAbout);
    
    $('.reset').off().on('click', () => {
        const player = getPlayer();
        resetInput();
        if (player) {
            player.destroy();
        }
    });
    
    oldBrowserCheck();
    // oT.input.loadPreviousFileDetails();
}

window.addEventListener('localized', onLocalized, false);

$(window).resize(function() {
    if (document.getElementById('media') ) {
        document.getElementById('media').style.width = oT.media.videoWidth();
    }
});


