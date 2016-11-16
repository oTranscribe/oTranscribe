import {getPlayer} from './player/player';

function getTime(){
    // get timestamp
    const player = getPlayer();
    let time = 0;
    if (player) {
        time = player.getTime();
    }
    const minutes = Math.floor(time / 60);
    const seconds = ("0" + Math.floor( time - minutes * 60 ) ).slice(-2);
    return {
        formatted: (minutes+":"+seconds).replace(/\s/g,''),
        raw: time
    };
};

function insertTimestamp(){
    var time = getTime();
    if (time) {
        document.execCommand('insertHTML',false,
        `<span class="timestamp" contenteditable="false" data-timestamp="${time.raw}" >${time.formatted}</span>&nbsp;`
        );
        activateTimestamps();
    }
}

function activateTimestamps(){
    Array.from(document.querySelectorAll('.timestamp')).forEach(el => {
        el.contentEditable = false;
        el.removeEventListener('click', onClick);
        el.addEventListener('click', onClick);
    });
}

function onClick() {
    const player = getPlayer();
    var time = this.dataset.timestamp;
    if (typeof time === 'string' && time.indexOf(':') > -1) {
        time = splitString(time);
    }
    if (player) {
        player.setTime( time );
    }    
}

// backwards compatibility, as old timestamps use setFromTimestamp() and ts.setFrom()
window.setFromTimestamp = function(clickts, element){
    ts.setFrom(clickts, element);
}
window.ts = {
    setFrom: function(clickts, element){
        const player = getPlayer();
        var time = this.dataset.timestamp;
        if (player && element.childNodes.length == 1) {
            const seconds = splitString(time);
            player.setTime( seconds );
        }
    }
}

function splitString(str) {
    var a = str.split(':');
    if (a.length === 3) {
        return ((+a[0]) * 60 * 60) + ((+a[1]) * 60) + (+a[2]); 
    }
    return (+a[0]) * 60 + (+a[1]); 
}

export {activateTimestamps, insertTimestamp};