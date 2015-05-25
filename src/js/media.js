
oT.media = {};

// dummy functions for before player is initialised
oT.player = function(){};
oT.player.playPause = function(){};
oT.player.skipTo = function(){};
oT.player.skip = function(){};
oT.player.speed = function(){};

// initialise a new player
oT.media.create = function(opts){
    opts.source = opts.file;
    opts.container = document.querySelector('#player-hook');
    opts.onDisableSpeedChange = function(){
        $('.speed-box').html('This media only supports 1x playback rate. Sorry.');
    }
    opts.buttons = {
        speedSlider: document.querySelector('#slider3'),
        playPause: document.querySelector('.button.play-pause')
    }
    oT.media.reset({
        callback: function(){
            // oTplayer is a separate module
            oT.player = new oTplayer(opts);
        }
    });
    oT.input.hide();
    setInterval(function(){
        adjustPlayerWidth();
    },50);
}

// switching files
oT.media.reset = function(options){
    options = options || {};
    oT.player.reset();
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

// calculate optimal width for video element based on window size
oT.media.videoWidth = function(){
    var boxOffset = document.getElementById('textbox').getBoundingClientRect().left;
    if ( boxOffset > 200 ) {
        return (boxOffset-40) + "px";
    }
}



