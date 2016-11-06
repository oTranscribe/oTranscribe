import {HTML5_AUDIO} from './html5-audio';

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

	constructor(opts){
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
	    this.driver = new opts.driver(source);
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

	    function checkIfReady(callback){
	        if (driver.isReady()) {
	            opts.onReady();
	        } else if (attempts < 20000) {
	            setTimeout(checkIfReady,10);
				attempts++;
	        } else {
	        	throw('Error with player driver');
	        }
	    }

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

    skip(direction){
    	if (direction === 'forwards') {
            this.driver.setTime( this.getTime() + this.skipTime );
        } else if ((direction === 'backwards') || direction === 'back') {
            this.driver.setTime( this.getTime() - this.skipTime );
        } else {
            throw ('Skip requires a direction: forwards or backwards')
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
    
    getName() {
        if (this.driver.getName) {
            return this.driver.getName();;
        }
        return this.name || '';
    }

    getTitle() {
        return getName();
    }

    destroy(){
        if (this.driver) {
            this.pause();
        	this.driver.destroy();
        }
    }
};

const playerDrivers = {
    HTML5_AUDIO: HTML5_AUDIO
};

let player = null;

function getPlayer() {
    return player;
};

function createPlayer(opts) {
    player = new Player(opts);
}

export {createPlayer, getPlayer, playerDrivers};