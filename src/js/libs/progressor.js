function Progressor( options ){
    this._media = options.media;
    this._bar = options.bar;
    this._text = options.text;
    this._time = options.time;
    this.initProgressBar();
    this.initMedia();
};


Progressor.prototype.initMedia = function() {
    this._media.addEventListener('timeupdate', this.updateProgress.bind(this), false);
    this._media.addEventListener('timeupdate', this.updateTimeCount.bind(this), false);
    this.addClickEvents();
    this.updateTimeCount(this._media);
};

Progressor.prototype.initProgressBar = function(){
    this._textBox = document.createElement('span');
    this._textBox.textContent = this._text || "";
    this._bar.style.position = "relative";
    this._bar.style.zIndex = 1;
    this._bar.className = this._bar.className + " progressor";
    
    this._progress = document.createElement('div');
    this._progress.className = "progressor-progress";
    this._progress.style.width = "0%";
    this._progress.style.height = "100%";
    this._progress.style.position = "absolute";
    this._progress.style.top = 0;
    this._progress.style.zIndex = -1;
    
    this._bar.style.webkitUserSelect = "none";
    this._bar.style.userSelect = "none";
    this._bar.appendChild ( this._textBox );
    this._bar.appendChild( this._progress );
};

Progressor.prototype.updateProgress = function() {
    this.updateTimeCount();
    var value = 0;
    if (this._media.currentTime > 0) {
        value = Math.floor((100 / this._media.duration) * this._media.currentTime);
    }
    // this._bar.getElementsByTagName('div')[0].clientWidth = value + "%";
    this._bar.getElementsByTagName('div')[0].style.width = value + "%";
};

Progressor.prototype.formatTime = function ( time ) {
    var minutes = Math.floor(time / 60);
    var seconds = ("0" + Math.round( time - minutes * 60 ) ).slice(-2);
    return minutes+":"+seconds;    
}

Progressor.prototype.updateTimeCount = function(){
    if ( this._time ) {
        var currTime = this.formatTime ( this._media.currentTime );
        var totalTime = this.formatTime ( this._media.duration );
        if ( isNaN( this._media.duration ) === true ) { totalTime = "00:00" };
        this._time.innerHTML = currTime + "/" + totalTime;        
    }
};


Progressor.prototype.timeFromCursorPosition = function(element, event, duration){
    var dimensions = element.getBoundingClientRect();
    var pixelsOfBar = event.clientX - dimensions.left;
    var percentToSecs = pixelsOfBar / dimensions.width;
    return percentToSecs * duration;
};

Progressor.prototype.setMediaProgress = function(event){
    this._media.currentTime = this.timeFromCursorPosition(
        this._bar,
        event,
        this._media.duration
    );
    this.updateProgress();
    
};

Progressor.prototype.remove = function(){
    function clearEvents(oldElement){
        var newElement = oldElement.cloneNode(true);
        oldElement.parentNode.replaceChild(newElement, oldElement);
    }
    this._time.innerHTML = "";
    this._bar.removeChild(this._textBox);
    this._bar.removeChild(this._progress);
    this._bar.style.position = "";
    this._bar.style.zIndex = "";
    this._bar.style.webkitUserSelect = "";
    this._bar.style.userSelect = "";
    this._bar.classList.remove("progressor");
    clearEvents( this._bar );
    clearEvents( this._media );
}

Progressor.prototype.addClickEvents = function(){
    var isMouseDown = false,
        wasPlaying = false,
        mouseEventRefresh = '';
    var mouseDown = function(e){
        isMouseDown = true;
        wasPlaying = !this._media.paused;
        this._media.pause();
        this.setMediaProgress(e);
    }
    var mouseUp = function(e){
        clearInterval(mouseEventRefresh);
        isMouseDown = false;
        if (wasPlaying == true) {
            this._media.play();
            wasPlaying = false;
        };
    }
    var mouseMove = function(e){
        if ( isMouseDown === true ) {
            mouseEventRefresh = setInterval( this.setMediaProgress(e) , 1000 );   
        }
    }
    this._bar.addEventListener("mousedown", mouseDown.bind(this) );
    document.addEventListener("mouseup", mouseUp.bind(this) );
    document.addEventListener("mousemove", mouseMove.bind(this) );
};

var progressor = {
    init : function(){
        console.error("'progressor.init()' is deprecated. Please use 'Progressor()'.");
    }
}