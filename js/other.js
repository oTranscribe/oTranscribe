
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
    if (type == "video") {
        var formats = ['mp3', 'ogg', 'webm', 'wav'];        
    } else if (type == "audio"){
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

function reactToFile(input){
    var file = input.files[0];
    if ( checkTypeSupport( file ) === true ){
        oT.media.create( file );
        oT.media.initProgressor();
        adjustPlayerWidth();
        toggleControls();
        localStorage.setItem("lastfile", file.name);
        console.log('Loading complete.') ;
    } else {
        var msg = "Your browser does not support " + file.type.split("/")[1] + " files. Switch to a different browser or <a href=\"http://media.io\">convert your file</a> to another format.";
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
    document.getElementById("formats").innerHTML = "Your browser supports "+listSupportedFormats("audio")+" audio files and "+listSupportedFormats("video")+" video files. You may need to <a href='http://media.io'>convert your file</a>.";    
}

function setStartButton(){
    $('.start').html('Start transcribing').addClass('ready');
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
        document.getElementById('old-browser').innerHTML = 'Your browser does not appear to support some HTML5 features necessary for oTranscribe to run correctly. Please switch to a <a href="http://browsehappy.com">modern desktop browser</a>.';
    }
}

function chromeOsCheck(){
    var ua = window.navigator.userAgent;
    if ( ua.indexOf("CrOS") > -1 ) {
        console.log("Chrome OS detected.");
        
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


