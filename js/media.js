
oT.media = {};

oT.media.e = function(){
    return document.getElementById('media') || null;
}

oT.media.create = function(file){

    if (window.webkitURL) {
        console.log('webkit');
        var url = window.webkitURL.createObjectURL(file);
    } else {
        var url = window.URL.createObjectURL(file);      
    }

    if ( file.type.indexOf("video") > -1 ) {
        var video = document.createElement('video');
        video.src = url;
        video.id = "media";
        video.style.width = oT.media.videoWidth();
        document.body.appendChild(video); 
    } else {
        $('#player-hook').append('<audio id="media" src=""></audio>');
        oT.media.e().src = url;            
    }
    
    console.log(file);
    console.log(file.name);
    
    oT.media.e().title = file.name;

}

oT.media.playPause = function(){
    var element = oT.media.e();
    var playing = !element.paused;
    var playPauseButton = $('.play-pause');
    if (playing == true){
        element.pause();
        playPauseButton.removeClass('playing');
    } else {
        element.currentTime = element.currentTime-1.5;
        element.play();
        playPauseButton.addClass('playing');
    };
    
}

oT.media.skip = function(direction){
    var element = oT.media.e();
    if (direction == "forwards"){
        element.currentTime = element.currentTime+1.5;
    } else if (direction == "backwards") {
        element.currentTime = element.currentTime-1.5;
    }
}

oT.media.speed = function(newSpeed){
    var min = 0.5;
    var max = 2;
    var step = 0.25;
    var newSpeedNumber;
    var currentSpeed = oT.media.e().playbackRate;
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
        oT.media.e().playbackRate = newSpeedNumber;
        document.getElementById('slider3').value = newSpeedNumber;        
    }
}

oT.media.videoWidth = function(){
    var boxOffset = document.getElementById('textbox').getBoundingClientRect().left;
    if ( boxOffset > 200 ) {
        return (boxOffset-40) + "px";
    }
}

oT.media.initAudioJS = function(){
    audiojs.events.ready(function() {
      audiojs.createAll();
    });
}

oT.media.initProgressor = function(){
    progressor.init({
        media : oT.media.e(),
        bar : $('#player-hook')[0],
        text : oT.media.e().title,
        time : $('#player-time')[0]    // element to contain live-updating time (optional)
    });
}

oT.media.reset = function(){
    location.reload();
}


