/******************************************
             Initialisation
******************************************/


function init(){
    oT.lang.applyLang();
    setTimeout(function(){
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
    },200);
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


