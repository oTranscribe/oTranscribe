/******************************************
             Initialisation
******************************************/


function init(){
    saveText();
    oT.backup.init();
    adjustEditorHeight();
    placeTextPanel();
    oT.input.dragListener();
    initWordCount();
    initWatchFormatting();
    oT.timestamp.activate();
    chromeOsCheck();
    gd.loadGoogleApiAsync();
}

window.addEventListener('localized', function() {
    setFormatsMessage();
    setStartButton();
    oldBrowserCheck();
    oT.input.loadPreviousFileDetails();
    $('#curr-lang').text( oT.lang.langs[document.webL10n.getLanguage()] );
}, false);


$(document).ready(function(){
    init();
    oT.lang.bide();
    if ( localStorage.getItem("lastfile") ) {
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


