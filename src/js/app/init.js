/******************************************
             Initialisation
******************************************/

const $ = require('jquery');

import { watchFormatting, watchWordCount } from './texteditor';
import googleDriveSetup from './google';
import inputSetup from './input';

export default function init(){
    // oT.backup.init();
    // adjustEditorHeight();
    // placeTextPanel();
    watchWordCount();
    watchFormatting();
    // oT.timestamp.activate();
    googleDriveSetup();
}

window.addEventListener('localized', function() {
    inputSetup();
    var startText = document.webL10n.get('start-ready');
    $('.start').text(startText).addClass('ready');
    
    // oldBrowserCheck();
    // oT.input.loadPreviousFileDetails();
    // $('#curr-lang').text( oT.lang.langs[document.webL10n.getLanguage()] );
}, false);


$(document).ready(function(){
    init();
    oT.lang.bide();
    if ( localStorageManager.getItem("lastfile") ) {
        toggleAbout();
    }
});

$(window).resize(function() {
    adjustEditorHeight();
    adjustPlayerWidth();
    placeTextPanel();
    if (document.getElementById('media') ) {
        document.getElementById('media').style.width = oT.media.videoWidth();
    }
});


