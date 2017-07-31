const $ = require('jquery');
import { getPlayer } from './player/player';
import { insertTimestamp, convertTimestampToSeconds, formatMilliseconds } from './timestamps';

let timeSelectionModalActive = false;
const $timeSelection = $('.controls .time-selection');

const hide = () => {
    timeSelectionModalActive = false;
    $('.controls .time-selection').removeClass('active');
}

const show = () => {
    timeSelectionModalActive = true;
    const player = getPlayer();

    if (timeSelectionModalActive === true) {
        $timeSelection.addClass('active');
        $timeSelection.find('input')
            .off()
            .val(formatMilliseconds(player.getTime()))
            .keyup(onTimeSelectionModalSubmit)
            .focus()
            .select();
    } else {
        $('.controls .time-selection').removeClass('active');
    }

    function onTimeSelectionModalSubmit(ev) {
        if (ev.keyCode === 13) { // return key
            const time = $(this).val();
            if (time.indexOf(':') > -1) {
                player.setTime(convertTimestampToSeconds(time));
            } else {
                // assume user is thinking in minutes
                player.setTime(parseFloat(time) * 60);
            }
            hide();
        }
    }
}

const toggle = () => {
    if (timeSelectionModalActive) {
        hide();
    } else {
        show();
    }
}

export default {
    toggle, show, hide
}
