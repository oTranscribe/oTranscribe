
oT.media = {};

oT.media.e = function(){
    var element = document.getElementById('media');
    if (element && element.tagName === 'IFRAME') {
        return oT.media.ytEl;
    }
    return element || null;
}

oT.media.create = function(file){
    
    if (file.indexOf && file.indexOf('youtube') > -1) {
        oT.media.yt(file);
        return;
    }

    if (window.webkitURL) {
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
    
    oT.media.e().title = file.name;

}

oT.media.skipTo = function(time){
    var element = oT.media.e();
    var yt = !!oT.media.ytEl;
    if (yt) {
        element.seekTo( time );
    } else {
       element.currentTime = time;
    }    
}

oT.media.playPause = function(){
    var element = oT.media.e();
    var playing = !element.paused;
    var playPauseButton = $('.play-pause');
    if (playing == true){
        element.pause();
        playPauseButton.removeClass('playing');
    } else {
        oT.media.skip('backwards');
        element.play();
        playPauseButton.addClass('playing');
    };
    
}

oT.media.skip = function(direction){
    var element = oT.media.e();
    var yt = !!oT.media.ytEl;
    var mod = 1;
    if (direction == "backwards"){
        mod = -1;
    }
    oT.media.skipTo( element.currentTime + (1.5*mod) );
}

oT.media.speed = function(newSpeed){
    var min = 0.5;
    var max = 2;
    var step = oT.media.speedIncrement || 0.25;
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
        if (oT.media.e().setPlaybackRate) {
            oT.media.e().setPlaybackRate(newSpeedNumber);
        }
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
    var p = new Progressor({
        media : oT.media.e(),
        bar : $('#player-hook')[0],
        text : oT.media.e().title,
        time : $('#player-time')[0]
    });
}

oT.media.disableSpeed = function(){
    $('.speed-box').html('This media only supports 1x playback rate. Sorry.');
    oT.media.speed = function(){
        return false;
    }
};

oT.media.yt = function(url){
    oT.media.yt.url = url;
    // import YouTube API
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    var video = document.createElement('div');
    video.setAttribute('id','media');
    document.body.appendChild(video); 
    
    function youtube_parser(url){
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var match = url.match(regExp);
        if (match&&match[2].length==11){
            return match[2];
        }else{
            alert(url);
        }
    }
    
    setInterval(function(){
        var $ifr = $('iframe#media');
        $ifr.width(oT.media.videoWidth); 
        $ifr.height( $ifr.width() * (3/4) );
    },500);
    
    function youtubeReady() {        
        
        var videoId = youtube_parser(oT.media.yt.url);
        oT.media.ytEl = new YT.Player('media', {
            width: '100%',
            videoId: videoId,
            playerVars: {
                // controls: 0,
                disablekb: 1,
                fs: 0,
                rel: 0,
                modestbranding: 1
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': updatePause
            }
        });
        
        function updatePause (ev){
            var status = ev.data;
            if (status === 2) {
                oT.media.ytEl.paused = true;
            } else {
                oT.media.ytEl.paused = false;
            }
        }
        
        oT.media.yt.setTitle(videoId);
        
        oT.media.ytEl.play = function(){
            oT.media.ytEl.playVideo()
        };
        oT.media.ytEl.pause = function(){
            oT.media.ytEl.pauseVideo(); 
        }
        oT.media.ytEl.paused = true;
        
        setInterval(function(){
            oT.media.ytEl.currentTime = oT.media.ytEl.getCurrentTime();
        },200);
        
        // YouTube embeds can't do 0.25 increments
        $('#slider3').attr('step',0.5);
        oT.media.speedIncrement = 0.5;
        
        function onPlayerReady(){
            // fix non-responsive keyboard shortcuts bug
            $('#slider3').val(0.5).change().val(1).change();        
            
            // Some YouTube embeds only support normal speed
            if (oT.media.ytEl.getAvailablePlaybackRates()[0] === 1) {
                oT.media.disableSpeed();
            }
        }
    }    
    window.onYouTubeIframeAPIReady = youtubeReady;
}

oT.media.yt.setTitle = function(id){
    var url = 'http://gdata.youtube.com/feeds/api/videos/'+id+'?v=2&alt=json-in-script&callback=?';
    $.ajax({
       type: 'GET',
        url: url,
        async: false,
        jsonpCallback: 'jsonCallback',
        contentType: "application/json",
        dataType: 'jsonp',
        success: function(d) {
            var title = '[YouTube] '+d.entry.title.$t;
            oT.media.e().title = title;
            oT.input.saveFileDetails({
                name: title,
                source: 'https://www.youtube.com/watch?v='+id
            })
            $('#player-hook').html(title).addClass('media-title');
            adjustPlayerWidth();
        }
    });
}

