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
    var audio = document.getElementById('audio');
    var playing = !audio.paused;
    var playPause = $('.play-pause');
    if (playing == true){
        audio.pause();
        playPause.removeClass('playing');
    } else {
        audio.currentTime = audio.currentTime-1.5;
        audio.play();
        playPause.addClass('playing');
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


