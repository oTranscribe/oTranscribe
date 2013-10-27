(function(){

/******************************************
             Audio player
******************************************/

function createPlayer(file){
    $('#audio').remove();
    $('#player-hook').append('<audio id="audio" src=""></audio>');
    if (window.webkitURL) {
        var url = window.webkitURL.createObjectURL(file);
    } else {
        var url = window.URL.createObjectURL(file);      
    }
    console.log(url);
    $('#audio')[0].src = url;    
}

// play/pause
function playPause(){
    var playing = !document.getElementById('audio').paused
    if (playing == true){
        document.getElementById('audio').pause();
        $('.play-pause').removeClass('playing');
    } else {
        document.getElementById('audio').play();
        $('.play-pause').addClass('playing');
    };
};

// skip forward
function skip(direction){
    var audio = document.getElementById('audio');
    if (direction == "forwards"){
        audio.currentTime = audio.currentTime+1.5;
    } else if (direction == "backwards") {
        audio.currentTime = audio.currentTime-1.5;
    }
}

// speed
function speed(newSpeed){
    var newSpeedNumber;
    var currentSpeed = document.getElementById('audio').playbackRate;
    if (newSpeed == "up"){
        newSpeedNumber = currentSpeed+0.1;
    } else if (newSpeed == "down"){
        newSpeedNumber = currentSpeed-0.1;
    } else if (newSpeed == "reset"){
        newSpeedNumber = 1;
    } else {
        newSpeedNumber = newSpeed;
    }
    document.getElementById('audio').playbackRate = newSpeedNumber;
}

function initAudioJS(){
    audiojs.events.ready(function() {
      audiojs.createAll();
    });
}



/******************************************
               Text editor
******************************************/




function adjustPlayerWidth(){
    var cntrls = $('.controls');
    console.log ("Window width: "+$(window).width()+"\nControls offset: "+cntrls.offset().left+"\nControls width: "+cntrls.width()+"\nTitle width: "+$('.title').width() );
    
    var gap = $(window).width() - (cntrls.offset().left + cntrls.width() + $('.title').outerWidth() );
    $('.scrubber').width( $('.scrubber').width()+gap );
   console.log(gap);
}


function toggleAbout(){
    $('.title').toggleClass('active');
    $('.about').toggleClass('active');
}

function adjustEditorHeight(){
    $('.textbox-container').height( window.innerHeight - 36 );
}

/******************************************
                Timestamp
******************************************/

// get timestamp
// var timestamp;
function getTimestamp(){
    // get timestap
    var time = document.getElementById('audio').currentTime  
    var minutes = Math.floor(time / 60);
    var seconds = ("0" + Math.round( time - minutes * 60 ) ).slice(-2);
    return minutes+":"+seconds;
};

function insertTimestamp(){
    insertAtCaret('textbox',"["+getTimestamp()+"]" );
}
    
// insert text at cursor
function insertAtCaret(areaId,text) {
	var txtarea = document.getElementById(areaId);
	var scrollPos = txtarea.scrollTop;
	var strPos = 0;
	var br = ((txtarea.selectionStart || txtarea.selectionStart == '0') ? 
		"ff" : (document.selection ? "ie" : false ) );
	if (br == "ie") { 
		txtarea.focus();
		var range = document.selection.createRange();
		range.moveStart ('character', -txtarea.value.length);
		strPos = range.text.length;
	}
	else if (br == "ff") strPos = txtarea.selectionStart;
	
	var front = (txtarea.value).substring(0,strPos);  
	var back = (txtarea.value).substring(strPos,txtarea.value.length); 
	txtarea.value=front+text+back;
	strPos = strPos + text.length;
	if (br == "ie") { 
		txtarea.focus();
		var range = document.selection.createRange();
		range.moveStart ('character', -txtarea.value.length);
		range.moveStart ('character', strPos);
		range.moveEnd ('character', 0);
		range.select();
	}
	else if (br == "ff") {
		txtarea.selectionStart = strPos;
		txtarea.selectionEnd = strPos;
		txtarea.focus();
	}
	txtarea.scrollTop = scrollPos;
}

function saveText(){
    // autosave every second
    var field = document.getElementById("textbox");
    if ( localStorage.getItem("autosave")) {
       field.innerHTML = localStorage.getItem("autosave");
    }
    setInterval(function(){
       localStorage.setItem("autosave", field.innerHTML);
    }, 1000);
    
}

function loadFileName(){
    // load existing file name
    if ( localStorage.getItem("lastfile") ) {
       document.getElementById("lastfile").innerHTML = "Last file: "+localStorage.getItem("lastfile");
       toggleAbout();
    }    
}

/******************************************
                Other
******************************************/


function detectFormats(format){
    var a = document.createElement('audio');
    return !!(a.canPlayType && a.canPlayType('audio/'+format+';').replace(/no/, ''));
}

function listSupportedFormats(){
    var supportedFormats = [];
    var formats = ['mp3', 'ogg', 'webm', 'wav'];
    var i = 0;
    formats.forEach(function(format, index) {
        if (detectFormats(format) == true){
            supportedFormats[i] = format;
            i++;
        }
    });
    return supportedFormats.join(', ');
}

function toggleControls(){
    $('.topbar').toggleClass('inputting');
    $('.input').toggleClass('active');
};

function setFormatsMessage(){
    document.getElementById("formats").innerHTML = "Your browser supports the following formats: "+listSupportedFormats()+". You may need to <a href='http://media.io'>convert your file</a>.";    
}

/******************************************
             Initialisation
******************************************/


function init(){
    saveText();
    loadFileName();
    setFormatsMessage();
    adjustEditorHeight();
}

init();

$(window).resize(function() {
    adjustEditorHeight();
    adjustPlayerWidth();
});


/******************************************
             User Interaction
******************************************/

    // keyboard shortcuts
    Mousetrap.bind('escape', function(e) {
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            // internet explorer
            e.returnValue = false;
        }
        playPause();
        return false;
    });
    Mousetrap.bind('f1', function(e) {
        skip('backwards');
        return false;
    });
    Mousetrap.bind('f2', function(e) {
        skip('forwards');
        return false;
    });
    // Mousetrap.bind('f3', function(e) {
    //     speed('down');
    //     return false;
    // });
    // Mousetrap.bind('f4', function(e) {
    //     speed('up');
    //     return false;
    // });
    Mousetrap.bind('mod+j', function(e) {
        document.execCommand('insertHTML',false,
        '<span class="timestamp" onclick="var x = this; setFromTimestamp(\'' + getTimestamp() + '\', x);">[' + getTimestamp() + ']</span>&nbsp;'
        );
        console.log(tsHTML);
        return false;
    });
    Mousetrap.bind('mod+s', function(e) {
        alert("No need to manually save - your transcript is automatically backed up continuously.")
        return false;
    });

    Mousetrap.bind('mod+b', function(e) {
        document.execCommand('bold',false,null);
        return false;
    });

    Mousetrap.bind('mod+i', function(e) {
        document.execCommand('italic',false,null);
        return false;
    });


    $('.play-pause').click(function(){
        playPause();    
    });

    $('.skip-backwards').click(function(){
        skip('backwards');    
    });
    $('.skip-forwards').click(function(){
        skip('forwards');    
    });

    $( ".speed" ).click(function() {
        if ($('.speed-box').not(':hover').length) {
            $(this).toggleClass('fixed');
            console.log ($('.speed-box').not(':hover').length);
        }    
    });

    $( "#slider3" ).mousemove(function() {
      speed(this.value);
    });
    
    $('.title').click(function(){
        toggleAbout();
    });

    $('.about .close').click(function(){
        toggleAbout();
    });
    
    $('#attach').change(function() {
      createPlayer( this.files[0] );
      initAudioJS();
      adjustPlayerWidth();
      toggleControls();        
      localStorage.setItem("lastfile", this.files[0].name);
      console.log('Loading complete.')    ;
    });
    
    // $('.timestamp').click(function(){
    //     setFromTimestamp( $(this) );
    // });
    
    

// End UI


})(); // end script


function splitTimestamp(hms){
    var a = hms.split(':');
    var seconds = (+a[0]) * 60 + (+a[1]); 
    return seconds;
}

$('.timestamp *:not(:has("*"))').click(function(){
    var clickts = $(this).data('timestamp');
});

function setFromTimestamp(clickts, element){
    console.log(element.childNodes.length);
    if (element.childNodes.length == 1) {
        document.getElementById('audio').currentTime = splitTimestamp(clickts);
    }
}
