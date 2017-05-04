/******************************************
             User Interaction
******************************************/

const $ = require('jquery');
const Mousetrap = require('mousetrap');
const Progressor = require('progressor.js');
import { getPlayer } from './player/player';
import { insertTimestamp } from './timestamps';
import timeSelectionModal from './time-selection-modal';
import { getSettings } from './settings/settings.jsx';

export function bindPlayerToUI(filename = '') {
    
    const shortcuts = getSettings().keyboardShortcuts.shortcuts;

    const player = getPlayer();
    if (!player) {
        return;
    }

    const $playPauseButton = $('.play-pause');
    
    var skippingButtonInterval;
    addKeyboardShortcut(shortcuts.backwards, player.skip.bind(player, 'backwards'));
    addKeyboardShortcut(shortcuts.forwards, player.skip.bind(player, 'forwards'));
    
    $('.skip-backwards').off().mousedown(function(){
        player.skip('backwards');
        skippingButtonInterval = setInterval(() => {
            player.skip('backwards');
        },100);
    }).mouseup(function(){
        clearInterval(skippingButtonInterval);
    });
    $('.skip-forwards').off().mousedown(function(){
        player.skip('forwards');    
        skippingButtonInterval = setInterval(() => {
            player.skip('forwards');
        },100);
    }).mouseup(function(){
        clearInterval(skippingButtonInterval);
    });
    
    $playPauseButton.off().click(playPause);
    addKeyboardShortcut(shortcuts.playPause, playPause)
    
    addKeyboardShortcut(shortcuts.timeSelection, timeSelectionModal.toggle);
    $('.player-time').off().click(timeSelectionModal.toggle);
    
    let changingSpeed = false;
    $('.speed-slider')
        .attr('min', player.minSpeed)
        .attr('max', player.maxSpeed)
        .attr('step', player.speedIncrement)
        .off()
        .on('change', function() {
            player.setSpeed(this.valueAsNumber);
        });

    player.onSpeedChange((speed) => {
        $('.speed-slider').val( speed );            
    });

    addKeyboardShortcut(shortcuts.speedDown, () => {
        player.speed('down');
    });
    addKeyboardShortcut(shortcuts.speedUp, () => {
        player.speed('up');
    });

    // make speed box sticky if button is clicked
    $( ".speed" ).off().mousedown(function() {
        if ($('.speed-box').not(':hover').length) {
            $(this).toggleClass('fixed');
        }    
    });

    const playerHook = document.querySelector('#player-hook');
    playerHook.innerHTML = '';
    if (document.querySelector('audio, video')) {
        var progressBar = new Progressor({
            media : document.querySelector('audio, video'),
            bar : playerHook,
            text : filename,                       
            time : document.querySelector('.player-time'),
            hours: true
        });
        document.querySelector('.player-time').style.display = 'block';
    } else {
        document.querySelector('.player-time').style.display = 'none';
    }
    
    player.onPlayPause(status => {
        if (status === 'playing'){
            $playPauseButton.addClass('playing');
        } else {
            $playPauseButton.removeClass('playing');
        }
    });
    
    setKeyboardShortcutsinUI();
    
    function playPause() {
        if (player.getStatus() !== 'playing'){
            player.play();
            $playPauseButton.addClass('playing');
        } else {
            player.pause();
            $playPauseButton.removeClass('playing');
        }
    };
    
}

export function addKeyboardShortcut(key, fn) {
    Mousetrap.unbind(key);
    Mousetrap.bind(key, function(e) {
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            // internet explorer
            e.returnValue = false;
        }
        fn();
        return false;
    });
    
}

export function keyboardShortcutSetup() {

    const shortcuts = getSettings().keyboardShortcuts.shortcuts;
    
    addKeyboardShortcut( shortcuts.bold,      () => document.execCommand('bold',false,null)       );
    addKeyboardShortcut( shortcuts.italic,    () => document.execCommand('italic',false,null)     );
    addKeyboardShortcut( shortcuts.underline, () => document.execCommand('underline',false,null)  );
    addKeyboardShortcut( shortcuts.addTimestamp, () => insertTimestamp()                             );
    addKeyboardShortcut( shortcuts.returnToStart, () => {
        const player = getPlayer();
        player.skipTo( 0 );
    });
    setKeyboardShortcutsinUI();
}

export const correctModKey = (binding) => {
    const isMac = window.navigator.platform.indexOf('Mac') > -1;
    const modKey = isMac? '⌘' : 'Ctrl';
    return binding.replace(/mod/g, modKey);
}

export const getFormattedShortcutFor = (shortcut, shortcuts) => {
    if (!shortcuts) {
        shortcuts = getSettings().keyboardShortcuts.shortcuts;
    }
    if ((shortcut in shortcuts) && shortcuts[shortcut].length > 0) {
        let text = shortcuts[shortcut][0];
        if (text === 'escape') {
            text = 'esc';
        }
        return correctModKey(text);
    }
    return '';
}

function setKeyboardShortcutsinUI() {
    const shortcuts = getSettings().keyboardShortcuts.shortcuts;
    $('[data-shortcut]').each(function() {
        const shortcut = $(this).attr('data-shortcut');
        $(this).text(getFormattedShortcutFor(shortcut, shortcuts));
    });
}