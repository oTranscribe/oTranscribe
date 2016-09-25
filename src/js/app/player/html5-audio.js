let HTML5_AUDIO = function(source){
    this.element = document.createElement( 'audio' );
    this.element.src = source;
	this.element.style.display = 'none';
	document.body.appendChild(this.element);
}
HTML5_AUDIO.prototype.play = function(){
    this.element.play();
    this.status = 'playing';
}
HTML5_AUDIO.prototype.pause = function(){
    this.element.pause();
    this.status = 'paused';
}
HTML5_AUDIO.prototype.getTime = function(){
    return this.element.currentTime;
}
HTML5_AUDIO.prototype.setTime = function(time){
    this.element.currentTime = time;
}
HTML5_AUDIO.prototype.getStatus = function(){
    return this.status;
}
HTML5_AUDIO.prototype.getLength = function(){
    return this.element.duration;
}
HTML5_AUDIO.prototype.isReady = function(){
    return (!this.destroyed && (!isNaN(this.element.duration)) && (this.element.readyState === 4));
}
HTML5_AUDIO.prototype.getSpeed = function(){
    return this.element.playbackRate;
}
HTML5_AUDIO.prototype.setSpeed = function(speed){
    return this.element.playbackRate = speed;
}
HTML5_AUDIO.prototype.destroy = function(speed){
    this.element.remove();
	delete this.element;
	this.destroyed = true;
}

export {HTML5_AUDIO as HTML5_AUDIO};