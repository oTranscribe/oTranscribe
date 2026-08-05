export default class HTML5_VIDEO {
    constructor(source) {
        this.element = document.createElement( 'video' );
        this.element.src = source;
        this.element.className = 'video-player';
    	document.body.appendChild(this.element);
    }
    play() {
        this.element.play();
        this.status = 'playing';
    }
    pause() {
        this.element.pause();
        this.status = 'paused';
    }
    getTime() {
        return this.element.currentTime;
    }
    setTime(time) {
        this.element.currentTime = time;
    }
    getStatus() {
        return this.status;
    }
    getLength() {
        return this.element.duration;
    }
    isReady() {
        return (!this.destroyed && (!isNaN(this.element.duration)) && (this.element.readyState === 4));
    }
    getSpeed() {
        return this.element.playbackRate;
    }
    setSpeed(speed){
        return this.element.playbackRate = speed;
    }
    destroy(speed){
        this.element.remove();
    	delete this.element;
    	this.destroyed = true;
    }
}
