/******************************************
             Initialisation
******************************************/


function init(){
    saveText();
    loadFileName();
    adjustEditorHeight();
    placeTextPanel();
    dragListener();
    initWordCount();
    initWatchFormatting();
    chromeOsCheck();
}

window.addEventListener('localized', function() {
    setFormatsMessage();
    setStartButton();
    oldBrowserCheck();
    $('#curr-lang').text( oT.lang.langs[document.webL10n.getLanguage()] );
}, false);


$(document).ready(function(){
    init();
    oT.lang.bide();
});

$(window).resize(function() {
    adjustEditorHeight();
    adjustPlayerWidth();
    placeTextPanel();
    if (document.getElementById('media') ) {
        document.getElementById('media').style.width = oT.media.videoWidth();
    }
});


