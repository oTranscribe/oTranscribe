import {getPlayer} from './player/player';

function getTime(formatInMilliseconds){
    // get timestamp
    const player = getPlayer();
    let time = 0;
    if (player) {
        time = player.getTime();
    }

    return {
        formatted: formatMilliseconds(time, formatInMilliseconds),
        raw: time
    };
};

function formatMilliseconds(time, formatInMilliseconds) {
    const hours = Math.floor(time / 3600).toString();
    const minutes = ("0" + Math.floor(time / 60) % 60).slice(-2);
    const seconds = ("0" + Math.floor( time % 60 )).slice(-2);
    let formatted = minutes + ":" + seconds;
    if (typeof formatInMilliseconds !== "undefined" && formatInMilliseconds) {
        const milliseconds = ("00" + Math.floor(getMilliSeconds(time))).slice(-3);
        formatted = formatted + "-" + milliseconds;
    }
    if (hours !== '0') {
        formatted = hours + ":" + formatted;
    }
    formatted = formatted.replace(/\s/g,'');
    return formatted;
}

// https://stackoverflow.com/a/16787062/3892957
function getMilliSeconds(num)
{
    return (num % 1) * 1000;
}

// http://stackoverflow.com/a/25943182
function insertHTML(newElement) {
    var sel, range;
    if (window.getSelection && (sel = window.getSelection()).rangeCount) {
        range = sel.getRangeAt(0);
        range.collapse(true);
        range.insertNode(newElement);

        // Move the caret immediately after the inserted span
        range.setStartAfter(newElement);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}


function insertTimestamp(formatInMilliseconds){
    var time = getTime(formatInMilliseconds);
    if (time) {
        const space = document.createTextNode("\u00A0");
        insertHTML(createTimestampEl(time));
        insertHTML(space);
        activateTimestamps();
    }
}

function createTimestampEl(time) {
    const timestamp = document.createElement('span');
    timestamp.innerText = time.formatted;
    timestamp.className = 'timestamp';
    timestamp.setAttribute('contenteditable', 'false');
    timestamp.setAttribute('data-timestamp', time.raw);
    return timestamp;
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

export {activateTimestamps, insertTimestamp, convertTimestampToSeconds, formatMilliseconds};
