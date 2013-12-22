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
}

init();

$(window).resize(function() {
    adjustEditorHeight();
    adjustPlayerWidth();
    placeTextPanel();
});


