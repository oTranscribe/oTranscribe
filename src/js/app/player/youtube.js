export default class YOUTUBE {
    constructor (source, callback){
        
        this.element = document.createElement('div');
        this.element.setAttribute('id','oTplayerEl');
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
                    'onStateChange': updatePause
                }
            });
        
            function updatePause (ev){
                var status = ev.data;
                if (status === 2) {
                    that.paused = true;
                } else {
                    that.paused = false;
                }
            }
            function onYTPlayerReady() {
                // fix non-responsive keyboard shortcuts bug
                $(this.buttons.speedSlider).val(0.5).change().val(1).change();
    
                // Some YouTube embeds only support normal speed
                if (this._ytEl.getAvailablePlaybackRates()[0] === 1) {
                    this.disableSpeedChange();
                }
    
                this.duration = this._ytEl.getDuration();
    
                setTimeout(() => {
                    // kickstart youtube
                    this.play();
                    setTimeout(() => {
                        this.pause();
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
        // return this.status;
    }
    getLength(){
        return this.duration;
    }
    isReady(){
        // return (!this.destroyed && (!isNaN(this.element.duration)) && (this.element.readyState === 4));
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
        
        oTplayer.prototype._setYoutubeTitle = function(id){
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
                    $('#player-hook').html(title).addClass('media-title');
                },
                error: function(e){
                    console.log(e);
                }
            });
        };
        
    }
    destroy(){
        // TK
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