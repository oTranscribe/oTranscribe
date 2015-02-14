
/******************************************
                Other
******************************************/


function detectFormats(format){
    var a = document.createElement('audio');
    return !!(a.canPlayType && a.canPlayType('audio/'+format+';').replace(/no/, ''));
}

function detectVideoFormats(format){
    var a = document.createElement('audio');
    return !!(a.canPlayType && a.canPlayType('audio/'+format+';').replace(/no/, ''));
}

function listSupportedFormats(type){
    if (type == "audio") {
        var formats = ['mp3', 'ogg', 'webm', 'wav'];        
    } else if (type == "video"){
        var formats = ['mp4', 'ogg', 'webm'];
    }
    var supportedFormats = [];
    var i = 0;
    formats.forEach(function(format, index) {
        if (detectFormats(format) == true){
            supportedFormats[i] = format;
            i++;
        }
    });
    return supportedFormats.join('/');
}

function listSupportedVideoFormats(){
    var supportedFormats = [];
    var formats = ['mp4', 'ogg', 'webm'];
    var i = 0;
    formats.forEach(function(format, index) {
        if (detectVideoFormats(format) == true){
            supportedFormats[i] = format;
            addAndToEnd(i, supportedFormats);
            i++;
        }
    });
    return supportedFormats.join(', ');
}

function checkTypeSupport(file){
    var fileType = file.type.split("/")[0];
    var a = document.createElement(fileType);
    return !!(a.canPlayType && a.canPlayType(file.type).replace(/no/, ''));
}

function setFormatsMessage(){
    var text = document.webL10n.get('formats');
    text = text.replace("[xxx]",listSupportedFormats("audio"));
    text = text.replace("[yyy]",listSupportedFormats("video"));
    document.getElementById("formats").innerHTML = text;
}

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
