
/******************************************
                Other
******************************************/

function setStartButton(){
    var startText = document.webL10n.get('start-ready');
    $('.start').text(startText).addClass('ready');
}

function html5Support(){
    var audioTagSupport = !!(document.createElement('audio').canPlayType);
    var contentEditableSupport = document.getElementById('textbox').contentEditable;
    var fileApiSupport = !!(window.FileReader);

    if (audioTagSupport && contentEditableSupport && fileApiSupport){
        return true;
    } else {
        return false;
    }
}

function oldBrowserCheck(){
    if ( html5Support() === false ){
        var oldBrowserWarning = document.webL10n.get('old-browser-warning');
        document.getElementById('old-browser').innerHTML = oldBrowserWarning;
    }
}

function chromeOsCheck(){
    var ua = window.navigator.userAgent;
    if ( ua.indexOf("CrOS") > -1 ) {
        
        Mousetrap.bind('ctrl+1', function(e) {
            pd(e);
            oT.player.skip('backwards');
            return false;
        });
        Mousetrap.bind('ctrl+2', function(e) {
            pd(e);
            oT.player.skip('forwards');
            return false;
        });
        Mousetrap.bind('ctrl+3', function(e) {
            pd(e);
            oT.player.speed('down');
            return false;
        });
        Mousetrap.bind('ctrl+4', function(e) {
            pd(e);
            oT.player.speed('up');
            return false;
        });
    }
}
