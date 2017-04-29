import HTML5_AUDIO from './html5-audio';
import HTML5_VIDEO from './html5-video';
import YOUTUBE from './youtube';

/*

options:
- driver
- source
- onReady

methods & properties:
- play
- pause
- getTime
- setTime (takes time in seconds)
- skip (forwards or backwards)
- getLength
- getStatus
- getSpeed
- setSpeed
- speed
- onSpeedChange (only supports one callback)


*/
class Player{

	constructor(opts, callback){
		if (!opts) {
	        throw('Player needs options');
	    }
	    if (!opts.driver) {
	        throw('Driver not specified');
	    }
	    if (!opts.source) {
	        throw('Source not specified');
	    }

	    let source = opts.source;
	    this.driver = new opts.driver(source, () => {
            if (this.onPlayPauseCallback) {
    	        this.onPlayPauseCallback(this.getStatus());
            }
	    });
	    this.skipTime = 1.5;
	    this.speedIncrement = 0.125;
	    this.minSpeed = 0.5;
	    this.maxSpeed = 2;
        if (opts.name) {
            this.name = opts.name;
        }

	    let attempts = 0;
		let driver = this.driver;
	    if (opts.onReady) {
	        checkIfReady();
	    };

        let _player = this;
	    function checkIfReady(callback){
	        if (driver.isReady()) {
	            opts.onReady(_player);
	        } else if (attempts < 20000) {
	            setTimeout(checkIfReady,10);
				attempts++;
	        } else {
	        	throw('Error with player driver');
	        }
	    }
        
        const setPlayerHeight = () => {
            const videoEl = document.querySelector('.video-player');
            if (videoEl) {
                videoEl.style.height = `${videoEl.offsetWidth * (3 / 4)}px`;
            }
        }
        setPlayerHeight();
        setInterval(setPlayerHeight, 200);

        

	}

    play(){
    	this.skip('backwards');
        this.driver.play();
    }

    pause(){
    	this.driver.pause();
    }

    getTime(){
    	return this.driver.isReady() ? this.driver.getTime() : 0;
    }

    setTime(time){
        this.driver.setTime(time);
    }
    
    skipTo(time) {
        this.setTime(time);
    }

    skip(direction){
        let expectedTime = this.getTime();
    	if (direction === 'forwards') {
            expectedTime += this.skipTime;
        } else if ((direction === 'backwards') || direction === 'back') {
            expectedTime -= this.skipTime;
        } else {
            throw ('Skip requires a direction: forwards or backwards')
        }
        this.setTime(expectedTime);
        
        // compensate for weird video setTime bug
        if ((expectedTime > 1) && (this.getTime() === 0)) {
            console.error('Skipped too far back');
            setTimeout(() => this.setTime(expectedTime), 50);
        }
    }

    getStatus(){
    	return this.driver.isReady() ? this.driver.getStatus() : 'inactive';
    }

    getLength(){
    	return this.driver.isReady() ? this.driver.getLength() : 0;
    }

    getSpeed(){
    	return this.driver.getSpeed();
    }

    setSpeed(speed){
    	if ((speed >= this.minSpeed) && (speed <= this.maxSpeed)) {
            this.driver.setSpeed(speed);
        } else {
            throw ('Speed is outside the min/max speed bounds')
        }
        this.onSpeedChangeCallback(speed);
    }

    speed(direction){
    	if (typeof direction === 'number') {
            this.driver.setSpeed( direction );
        } else if (direction === 'up') {
            this.setSpeed( this.getSpeed() + this.speedIncrement );
        } else if (direction === 'down') {
            this.setSpeed( this.getSpeed() - this.speedIncrement );
        } else {
            throw ('Speed requires a direction: up or down')
        }
    }
    
    onSpeedChange(callback) {
        this.onSpeedChangeCallback = callback;
    }
    
    onPlayPause(callback) {
        this.onPlayPauseCallback = callback;
    }
    
    getName() {
        if (this.driver.getName) {
            return this.driver.getName();;
        }
        return this.name || '';
    }

    getTitle() {
        return this.getName();
    }

    destroy(){
        if (this.driver) {
            this.pause();
        	this.driver.destroy();
        }
    }
};

const playerDrivers = {
    HTML5_AUDIO,
    HTML5_VIDEO,
    YOUTUBE
};

let player = null;

function getPlayer() {
    return player;
};

function createPlayer(opts) {
    return new Promise((res, rej) => {
        opts.onReady = res;
        player = new Player(opts);
    });
}

function isVideoFormat(file) {
    if ('type' in file) {
        return file.type.indexOf('video') > -1;
    }
    var urlSplt = file.split('.');
    var format = urlSplt[urlSplt.length-1];
    return !!format.match(/mov|mp4|avi|webm/);    
}

// https://remysharp.com/2010/07/21/throttling-function-calls
function debounce(fn, delay) {
  var timer = null;
  return function () {
    var context = this, args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
}


export {createPlayer, getPlayer, playerDrivers, isVideoFormat};