
oT.media = {};
oT.player = function(){};
oT.player.playPause = function(){};
oT.player.skipTo = function(){};
oT.player.skip = function(){};
oT.player.speed = function(){};

oT.media.create = function(opts){
    oT.media.reset({
        callback: function(){
            oT.player = new oT.playerObj(opts);
        }
    });
    oT.input.hide();
    setInterval(function(){
        adjustPlayerWidth();
    },500);
}

oT.playerObj = function(opts){
    var that = this;
    this.file = opts.file;
    if (opts.startpoint) {
        this._startPoint = opts.startpoint;
    }
    if (this.file.indexOf && oT.media.ytParse(this.file)) {
        this.format = 'youtube';
        $('#player-time').hide();
        this._buildYoutube();
    } else {
        var url = this._createObjectURL(opts.file);
        if ( this.file.type.indexOf("video") > -1 ) {
            this._buildVideo(url);
            this.format = 'video';
        } else {
            this._buildAudio(url);
            this.format = 'audio';
        }
        this.title = this.file.name;
        this._initProgressor();
    }
    this.paused = true;
}
oT.playerObj.prototype._initProgressor = function(){
    this.progressBar = new Progressor({
        media : this.element,
        bar : $('#player-hook')[0],
        text : this.title,
        time : $('#player-time')[0]
    });
}

oT.playerObj.prototype._createObjectURL = function(file){
    if (window.webkitURL) {
        return window.webkitURL.createObjectURL(file);
    } else {
        return window.URL.createObjectURL(file);      
    }
}
oT.playerObj.prototype._buildVideo = function(url){
    this.element = document.createElement('video');
    this.element.src = url;
    this.element.id = "media";
    this.element.style.width = oT.media.videoWidth();
    document.body.appendChild(this.element); 
}
oT.playerObj.prototype._buildAudio = function(url){
    this.element = document.createElement('audio');
    this.element.src = url;
    this.element.id = "media";
    $('#player-hook').append(this.element);
}
oT.playerObj.prototype.remove = function(){
    $(this.element).remove();
}
oT.playerObj.prototype.pause = function(){
    var playPauseButton = $('.play-pause');
    playPauseButton.removeClass('playing');
    if(this.format === 'youtube') {
        this._ytEl.pauseVideo();
    } else {
        this.element.pause();
    }
    this.paused = true;
}
oT.playerObj.prototype.play = function(){
    var playPauseButton = $('.play-pause');
    this.skip('backwards');
    playPauseButton.addClass('playing');
    if(this.format === 'youtube') {
        this._ytEl.playVideo();
    } else {
        this.element.play();
    }
    this.paused = false;
}
oT.playerObj.prototype.playPause = function(){
    if (this.paused === false){
        this.pause();
    } else {
        this.play();
    };    
}
oT.playerObj.prototype.skipTo = function(time){
    if (this.format === 'youtube') {
        this._ytEl.seekTo( time );
    } else {
       this.element.currentTime = time;
    }    
    
};
oT.playerObj.prototype.skip = function(direction){
    var mod = 1;
    if (direction == "backwards"){
        mod = -1;
    }
    this.skipTo( this.element.currentTime + (1.5*mod) );
}
oT.playerObj.prototype.speed = function(newSpeed){
    var el = this.element;
    if (this.format === 'youtube') {
        el = this._ytEl;
    }
    var min = 0.5;
    var max = 2;
    var step = oT.media.speedIncrement || 0.25;
    var newSpeedNumber;
    var currentSpeed = this.element.playbackRate;
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
       el.playbackRate = newSpeedNumber;
        if (el.setPlaybackRate) {
            el.setPlaybackRate(newSpeedNumber);
        }
        document.getElementById('slider3').value = newSpeedNumber;        
    }
}
oT.playerObj.prototype.getTime = function(){
    return this.element.currentTime;
}
oT.playerObj.prototype.getDuration = function(){
    return this.element.duration;
}

oT.playerObj.prototype.reset = function(){
    this.speed("reset");
    $('#media').remove();
    $('#player-time').show();
    $('#player-hook').removeClass('progressor media-title media-titleprogressor').empty();
}



oT.media.reset = function(options){
    options = options || {};
    if (oT.player.reset) {
        oT.player.reset();
        oT.player = {};
    }
    if (options.input) {
        oT.input.loadPreviousFileDetails();
        oT.input.show();
    }
    if (options.callback) {
        setTimeout(function(){
            options.callback();
        },500);
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

oT.media.disableSpeed = function(){
    $('.speed-box').html('This media only supports 1x playback rate. Sorry.');
    oT.media.speed = function(){
        return false;
    }
};

oT.playerObj.prototype._youtubeReady = function(){
    var that = this;

    var videoId = oT.media.ytParse(this.file);
    this._ytEl = new YT.Player('media', {
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
            'onReady': this._youtubeReadyPartTwo.bind(this),
            'onStateChange': updatePause
        }
    });
    
    this._setYoutubeTitle(videoId);
        
    setInterval(function(){
        that.element.currentTime = that._ytEl.getCurrentTime();
    },200);
        
    // YouTube embeds can't do 0.25 increments
    $('#slider3').attr('step',0.5);
    oT.media.speedIncrement = 0.5;
    
    function updatePause (ev){
        var status = ev.data;
        if (status === 2) {
            this.paused = true;
        } else {
            this.paused = false;
        }
    }
    
}

oT.playerObj.prototype._youtubeReadyPartTwo = function(){
    // fix non-responsive keyboard shortcuts bug
    $('#slider3').val(0.5).change().val(1).change();
    
    // Some YouTube embeds only support normal speed
    if (this._ytEl.getAvailablePlaybackRates()[0] === 1) {
        oT.media.disableSpeed();
    }
    
    this.element.duration = this._ytEl.getDuration()

    var that = this;
    
    setTimeout(function(){
        // kickstart youtube
        this.play();
        setTimeout(function(){
            that.pause();
            if (oT.media.startPoint) {
                setTimeout(function(){
                    that.seekTo( oT.media.startPoint );
                },500);
            }
        },500);
        
    },1000);

}


oT.playerObj.prototype._buildYoutube = function(url){
    this.url = url;
    
    this.element = document.createElement('div');
    this.element.setAttribute('id','media');
    document.body.appendChild(this.element); 
        
    setInterval(function(){
        var $ifr = $('iframe#media');
        $ifr.width(oT.media.videoWidth); 
        $ifr.height( $ifr.width() * (3/4) );
    },500);
    
    // import YouTube API
    if ( $('#youtube-script').length === 0) {
        var tag = document.createElement('script');
        tag.setAttribute('id','youtube-script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
        this._youtubeReady(this);
    }
    window.onYouTubeIframeAPIReady = this._youtubeReady.bind(this);        
}

oT.media.ytParse = function(url){
    if (url.match) {
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var match = url.match(regExp);
        if (match&&match[2].length==11){
            return match[2];
        }
    }
    return false;
}

oT.playerObj.prototype._setYoutubeTitle = function(id){
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
            this.title = title;
            oT.input.saveFileDetails({
                name: title,
                source: 'https://www.youtube.com/watch?v='+id
            });
            $('#player-hook').html(title).addClass('media-title');
            adjustPlayerWidth();
        },
        error: function(e){
            console.log(e);
        }
    });
}

