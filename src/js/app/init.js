/******************************************
             Initialisation
******************************************/

const $ = require('jquery');

import { watchFormatting, watchWordCount, toggleAbout } from './texteditor';
import googleDriveSetup from './google';
import inputSetup from './input';
import oldBrowserCheck from './old-browsers';
import languageSetup from './languages';
import { createPlayer, playerDrivers, getPlayer } from './player/player';
import { bindPlayerToUI } from './ui';
import { activateTimestamps, insertTimestamp } from './timestamps';
import { initBackup } from './backup';

export default function init(){
    initBackup();
    watchWordCount();
    watchFormatting();
    languageSetup();
    activateTimestamps();

    // this is necessary due to execCommand restrictions
    // see: http://stackoverflow.com/a/33321235
    window.insertTimestamp = insertTimestamp;

    googleDriveSetup();
    if ( localStorageManager.getItem("lastfile") ) {
        toggleAbout();
    }
}

// note: this function may run multiple times
function onLocalized() {
    const resetInput = inputSetup({
        create: function(file) {
		    createPlayer({
		        driver: playerDrivers.HTML5_AUDIO,
		        source: window.URL.createObjectURL(file)
		    });
            bindPlayerToUI(file.name);
        }
    });
    
    var startText = document.webL10n.get('start-ready');
    $('.start')
        .text(startText)
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


