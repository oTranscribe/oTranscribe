/******************************************
             Initialisation
******************************************/


function init(){
    oT.backup.init();
    adjustEditorHeight();
    placeTextPanel();
    initWordCount();
    initWatchFormatting();
    oT.timestamp.activate();
    gd.loadGoogleApiAsync();
}

window.addEventListener('localized', function() {
    oT.input.setup();
    setStartButton();
    oldBrowserCheck();
    oT.input.loadPreviousFileDetails();
    $('#curr-lang').text( oT.lang.langs[document.webL10n.getLanguage()] );
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


