const $ = require('jquery');

export default class YOUTUBE {
    constructor (source, playPauseCallback){
        
        this.element = document.createElement('div');
        this.element.setAttribute('id','oTplayerEl');
        this.element.className = 'video-player';
        document.body.appendChild(this.element); 
        
        
        loadScriptTag(() => {
        
            var videoId = parseYoutubeURL(source);
            this._ytEl = new YT.Player('oTplayerEl', {
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
                    'onReady': onYTPlayerReady.bind(this),
                    'onStateChange': onStateChange.bind(this)
                }
            });
        
            function onStateChange (ev){
                var status = ev.data;
                if (status === 1) {
                    this.status = 'playing';
                } else {
                    this.status = 'paused';
                }
                playPauseCallback();
            }
            function onYTPlayerReady() {
                // fix non-responsive keyboard shortcuts bug
                $('input.speed-slider').val(0.5).change().val(1).change();
    
                // Some YouTube embeds only support normal speed
                if (this._ytEl.getAvailablePlaybackRates()[0] === 1) {
                    $('.speed-box').html('This media only supports 1x playback rate. Sorry.');
                }
    
                this.duration = this._ytEl.getDuration();
                
                setTimeout(() => {
                    // kickstart youtube
                    this.play();
                    setTimeout(() => {
                        this.pause();
                        
                        this._isReady = true;
                        window._ytEl = this._ytEl;

                        
                        
                    },500);
        
                },1000);

            
            }
        });
        
        function loadScriptTag(callback) {
            // import YouTube API
            if ( window.YT === undefined ) {
                var tag = document.createElement('script');
                tag.setAttribute('id','youtube-script');
                tag.src = "https://www.youtube.com/iframe_api";
                var firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            } else {
                callback();
            }
            window.onYouTubeIframeAPIReady = callback;
        }        
        
    }
    play(){
        this._ytEl.playVideo();
    }
    pause(){
        this._ytEl.pauseVideo();
    }
    getTime(){
        return this._ytEl.getCurrentTime();
    }
    setTime(time){
        this._ytEl.seekTo( time );
    }
    getStatus(){
        return this.status;
    }
    getLength(){
        return this.duration;
    }
    isReady(){
        return this._isReady;
    }
    getSpeed(){
        if ('getPlaybackRate' in this._ytEl) {
            return this._ytEl.getPlaybackRate();
        } else {
            return 1;
        }
    }
    setSpeed(speed){
        if ('setPlaybackRate' in this._ytEl) {
            this._ytEl.setPlaybackRate(speed);
        }
    }
    getName() {
        
        // oTplayer.prototype._setYoutubeTitle = function(id){
        //     var url = 'http://gdata.youtube.com/feeds/api/videos/'+id+'?v=2&alt=json-in-script&callback=?';
        //     $.ajax({
        //        type: 'GET',
        //         url: url,
        //         async: false,
        //         jsonpCallback: 'jsonCallback',
        //         contentType: "application/json",
        //         dataType: 'jsonp',
        //         success: function(d) {
        //             var title = '[YouTube] '+d.entry.title.$t;
        //             this.title = title;
        //             $('#player-hook').html(title).addClass('media-title');
        //         },
        //         error: function(e){
        //             console.log(e);
        //         }
        //     });
        // };
        
    }
    destroy(){
        $('#oTplayerEl').remove();
        delete this.element; 
    }
}

function parseYoutubeURL(url){
    if (url.match) {
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var match = url.match(regExp);
        if (match&&match[2].length===11){
            return match[2];
        }
    }
    return false;
};