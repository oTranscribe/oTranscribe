/******************************************
             Initialisation
******************************************/


function init(){
    oldBrowserCheck();
    saveText();
    loadFileName();
    setFormatsMessage();
    adjustEditorHeight();
    placeTextPanel();
    dragListener();
    initWordCount();
    initWatchFormatting();
    chromeOsCheck();
    setStartButton();
    oT.lang.applyLang();
}

$(document).ready(function(){
    init();
});

$(window).resize(function() {
    adjustEditorHeight();
    adjustPlayerWidth();
    placeTextPanel();
    document.getElementById('media').style.width = oT.media.videoWidth();
});


