(function(){

/******************************************
             Audio player
******************************************/

function createPlayer(file){
    $('#audio').remove();
    $('#player-hook').append('<audio id="audio" src=""></audio>');
    if (window.webkitURL) {
        console.log('webkit');
        var url = window.webkitURL.createObjectURL(file);
    } else {
        var url = window.URL.createObjectURL(file);      
    }
    console.log(url);
    $('#audio')[0].src = url;    
    console.log(file.name);
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
    console.log(typeof newSpeed);
    var min = 0.5;
    var max = 2;
    var step = 0.25;
    var newSpeedNumber;
    var currentSpeed = document.getElementById('audio').playbackRate;
    if ((newSpeed == "up") && (currentSpeed < max)){
        newSpeedNumber = currentSpeed+step;
    } else if ((newSpeed == "down") && (currentSpeed > min)){
        newSpeedNumber = currentSpeed-step;
    } else if (newSpeed == "reset"){
        newSpeedNumber = 1;
    } else if (typeof newSpeed == 'number') {
        newSpeedNumber = newSpeed;
    }
    if (typeof(newSpeedNumber) != "undefined") {
        document.getElementById('audio').playbackRate = newSpeedNumber;
        document.getElementById('slider3').value = newSpeedNumber;        
    }
}

function initAudioJS(){
    audiojs.events.ready(function() {
      audiojs.createAll();
    });
}

function resetPlayer(){
    location.reload();
}


/******************************************
               Text editor
******************************************/




function adjustPlayerWidth(){
    var cntrls = $('.controls');
    console.log ("Window width: "+$(window).width()+"\nControls offset: "+cntrls.offset().left+"\nControls width: "+cntrls.width()+"\nTitle width: "+$('.title').width() );
    
    var gap = $(window).width() - (cntrls.offset().left + cntrls.width() + $('.title').outerWidth()  + $('.help-title').outerWidth() );
    $('.scrubber').width( $('.scrubber').width()+gap );
   console.log(gap);
}


function toggleAbout(){
    $('.help-title').removeClass('active');
    $('.help').removeClass('active');
    $('.title').toggleClass('active');
    $('.about').toggleClass('active');
}

function toggleHelp(){
    $('.title').removeClass('active');
    $('.about').removeClass('active');
    $('.help-title').toggleClass('active');
    $('.help').toggleClass('active');
}


function adjustEditorHeight(){
    $('.textbox-container').height( window.innerHeight - 36 );
}

function placeTextPanel(){
   var position = parseInt( $('#textbox').offset().left, 10) + 700;
   $('.text-panel').css('left', position);
}

function countWords(str) {
    var count = 0,
                i,
                j = str.length;

    for (i = 0; i <= j;i++){
        if (str.charAt(i) == " ") {
            count ++;
        }
    }
    return count + 1;  
}

function countTextbox(){
    var count = countWords( document.getElementById('textbox').innerHTML );
    document.getElementById('wc').innerHTML = count;
}

function initWordCount(){
    setInterval(function(){
        countTextbox();
    }, 1000);
    
}


function watchFormatting(){
    var b = document.queryCommandState("Bold");
    var bi = document.getElementById("icon-b");
    var i = document.queryCommandState("italic");
    var ii = document.getElementById("icon-i");
    
    if (b === true){
        bi.className = "icon-bold active"
    } else {
        bi.className = "icon-bold"
    }
    if (i === true){
        ii.className = "icon-italic active"
    } else {
        ii.className = "icon-italic"
    }
}

function initWatchFormatting(){
    setInterval(function(){
        watchFormatting();
    }, 100);
}


/******************************************
                Timestamp
******************************************/

// get timestamp
// var timestamp;


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

function dragListener(){
    var button = $('.file-input-wrapper')[0];
    button.addEventListener('dragover', function(){
        $('.file-input-wrapper').addClass('hover');
    }, false);
    button.addEventListener('dragleave', function(){
        $('.file-input-wrapper').removeClass('hover');
    }, false);
    
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

function checkTypeSupport(file){
  var a = document.createElement('audio');
  return !!(a.canPlayType && a.canPlayType(file.type).replace(/no/, ''));
}

function reactToFile(input){
    var file = input.files[0];
    if ( checkTypeSupport( file ) === true ){
        createPlayer( file );
        initAudioJS();
        adjustPlayerWidth();
        toggleControls();
        localStorage.setItem("lastfile", file.name);
        $('.scrubber .loaded').html( file.name );
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
    document.getElementById("formats").innerHTML = "Your browser supports the following formats: "+listSupportedFormats()+". You may need to <a href='http://media.io'>convert your file</a>.";    
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
    setStartButton();
}

init();

$(window).resize(function() {
    adjustEditorHeight();
    adjustPlayerWidth();
    placeTextPanel();
});


/******************************************
             User Interaction
******************************************/

    // keyboard shortcuts
    function pd(e){
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            // internet explorer
            e.returnValue = false;
        }
    }

    Mousetrap.bind('escape', function(e) {
        pd(e);
        playPause();
        return false;
    });
    Mousetrap.bind('f1', function(e) {
        pd(e);
        skip('backwards');
        return false;
    });
    Mousetrap.bind('f2', function(e) {
        pd(e);
        skip('forwards');
        return false;
    });
    Mousetrap.bind('f3', function(e) {
        pd(e);
        speed('down');
        return false;
    });
    Mousetrap.bind('f4', function(e) {
        pd(e);
        speed('up');
        return false;
    });
    Mousetrap.bind('mod+j', function(e) {
        pd(e);
        ts.insert();
        return false;
    });
    Mousetrap.bind('mod+s', function(e) {
        pd(e);
        alert("No need to manually save - your transcript is automatically backed up continuously.")
        return false;
    });

    Mousetrap.bind('mod+b', function(e) {
        pd(e);
        document.execCommand('bold',false,null);
        return false;
    });

    Mousetrap.bind('mod+i', function(e) {
        pd(e);
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
    
    $('.button.refresh').click(function(){
        resetPlayer();
    });
    

    $( "#slider3" ).change(function() {
      speed(this.valueAsNumber);
    });    
    
    $('.title').click(function(){
        toggleAbout();
        console.log('about');
    });

    $('.help-title').click(function(){
        toggleHelp();
    });

    $('#close-help').click(function(){
        toggleHelp();
    });


    $('.about .start.ready').click(function(){
        toggleAbout();
    });
    
    $('#attach').change(function() {
        reactToFile(this);
    });    


// End UI



})(); // end script


/******************************************
               Timestamp
******************************************/


var ts = {
    split : function(hms){
        var a = hms.split(':');
        var seconds = (+a[0]) * 60 + (+a[1]); 
        return seconds;
    },
    setFrom : function(clickts, element){
        console.log(element.childNodes.length);
        if (element.childNodes.length == 1) {
            document.getElementById('audio').currentTime = ts.split(clickts);
        }
    },
    get : function(){
        // get timestap
        var time = document.getElementById('audio').currentTime  
        var minutes = Math.floor(time / 60);
        var seconds = ("0" + Math.round( time - minutes * 60 ) ).slice(-2);
        return minutes+":"+seconds;
    },
    insert : function(){
        document.execCommand('insertHTML',false,
        '<span class="timestamp" contenteditable="false" onclick="var x = this; ts.setFrom(\'' + ts.get() + '\', x);">' + ts.get() + '</span>&nbsp;'
        );
        $('.timestamp').each(function( index ) {
            $( this )[0].contentEditable = false;
        });
    }
}

// backwards compatibility, as old timestamps use setFromTimestamp()
function setFromTimestamp(clickts, element){
    ts.setFrom(clickts, element);
}





