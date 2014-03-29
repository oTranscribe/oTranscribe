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
    console.log( document.webL10n.getLanguage() );
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
    document.getElementById('media').style.width = oT.media.videoWidth();
});


