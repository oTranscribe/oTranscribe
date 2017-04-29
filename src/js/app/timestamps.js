import {getPlayer} from './player/player';

function getTime(){
    // get timestamp
    const player = getPlayer();
    let time = 0;
    if (player) {
        time = player.getTime();
    }
    
    const hours = Math.floor(time / 3600).toString();
    const minutes = ("0" + Math.floor(time / 60) % 60).slice(-2);
    const seconds = ("0" + Math.floor( time % 60 )).slice(-2);
    let formatted = minutes+":"+seconds;
    if (hours !== '0') {
        formatted = hours + ":" + minutes + ":" + seconds;
    }

    return {
        formatted: formatted.replace(/\s/g,''),
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
    if (player) {
        if (typeof time === 'string' && time.indexOf(':') > -1) {
            // backwards compatibility, as old timestamps have string rather than number
            player.setTime(convertTimestampToSeconds(time));
        } else {
            player.setTime( time );
        }
    }    
}

// backwards compatibility, as old timestamps use setFromTimestamp() and ts.setFrom()
window.setFromTimestamp = function(clickts, element){
    window.ts.setFrom(clickts, element);
}
window.ts = {
    setFrom: function(clickts, element){
        const player = getPlayer();
        var time = this.dataset.timestamp;
        if (player && element.childNodes.length == 1) {
            player.setTime( convertTimestampToSeconds(time) );
        }
    }
}

function convertTimestampToSeconds(hms) {
    var a = hms.split(':');
    if (a.length === 3) {
        return ((+a[0]) * 60 * 60) + (+a[1]) * 60 + (+a[2]);
    }
    return (+a[0]) * 60 + (+a[1]);
}

export {activateTimestamps, insertTimestamp, convertTimestampToSeconds};