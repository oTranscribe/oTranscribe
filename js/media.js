
oT.media = {};

oT.media.e = function(){
    var element = document.getElementById('media');
    if (element.tagName === 'IFRAME') {
        return oT.media.ytEl;
    }
    return element || null;
}

oT.media.create = function(file){
    
    if (file.indexOf('youtube') > -1) {
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
        oT.media.e().setPlaybackRate(newSpeedNumber);
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
        oT.media.ytEl = new YT.Player('media', {
            width: '100%',
            videoId: youtube_parser(oT.media.yt.url),
            playerVars: {
                // controls: 0,
                disablekb: 1,
                fs: 0,
                rel: 0,
                modestbranding: 1
            },
            events: {
                // 'onReady': onPlayerReady,
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
        
        // youtube video title
        
        
        var url = 'http://gdata.youtube.com/feeds/api/videos/M7lc1UVf-VE?v=2&alt=json-in-script&callback=?';
        $.ajax({
           type: 'GET',
            url: url,
            async: false,
            jsonpCallback: 'jsonCallback',
            contentType: "application/json",
            dataType: 'jsonp',
            success: function(d) {
                console.log(d.entry.title.$t);
                oT.media.e().title = 'YouTube: '+d.entry.title.$t;
            }
        });
        
        oT.media.ytEl.play = function(){
            oT.media.ytEl.playVideo()
        };
        oT.media.ytEl.pause = function(){
            oT.media.ytEl.pauseVideo(); 
        }
        oT.media.ytEl.paused = true;
        
        setInterval(function(){
            oT.media.ytEl.duration = oT.media.e().getDuration();
            oT.media.e().currentTime = oT.media.e().getCurrentTime();
            $(oT.media.e()).trigger('timeupdate');
            console.log(oT.media.e().currentTime,oT.media.e().duration);
        },100);
    }    
    window.onYouTubeIframeAPIReady = youtubeReady;
}

