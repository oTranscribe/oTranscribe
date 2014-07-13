
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

oT.input = {};
oT.input.reactToFile = function(input){
    var file = input.files[0];
    if ( checkTypeSupport( file ) === true ){
        oT.media.create( file );
        oT.media.initProgressor();
        toggleControls();
        adjustPlayerWidth();
        localStorage.setItem("lastfile", file.name);
    } else {
        var msg = document.webL10n.get('format-warn');
        msg = msg.replace('[file-format]',file.type.split("/")[1]);
        $('#formats').html(msg).addClass('warning');
    }
}

oT.input.askForYoutube = function(){
    var url = prompt("Enter YouTube video URL:");
    if ( url.indexOf('youtube') > -1 ){
        oT.media.create( url );
        toggleControls();
        $('#player-time').hide();
    } else {
        var msg = 'Please enter a valid YouTube URL.'
        $('#formats').html(msg).addClass('warning');
    }   
}

function toggleControls(){
    $('.topbar').toggleClass('inputting');
    $('.input').toggleClass('active');
    $('.sbutton.time').toggleClass('active');
    $('.text-panel').toggleClass('editing');
};

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
            skip('backwards');
            return false;
        });
        Mousetrap.bind('ctrl+2', function(e) {
            pd(e);
            skip('forwards');
            return false;
        });
        Mousetrap.bind('ctrl+3', function(e) {
            pd(e);
            speed('down');
            return false;
        });
        Mousetrap.bind('ctrl+4', function(e) {
            pd(e);
            speed('up');
            return false;
        });
    }
}
