/******************************************
             User Interaction
******************************************/

const $ = require('jquery');
const Mousetrap = require('mousetrap');
const Progressor = require('progressor.js');
import { getPlayer } from './player/player';
import { insertTimestamp } from './timestamps';

export function bindPlayerToUI(filename = '') {
    
    const player = getPlayer();

    const $playPauseButton = $('.play-pause');
    
    var skippingButtonInterval;
    addKeyboardShortcut(['f1','mod+1'], player.skip.bind(player, 'backwards'));
    addKeyboardShortcut(['f2','mod+2'], player.skip.bind(player, 'forwards'));
    
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
    addKeyboardShortcut('escape', playPause)
    
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

    addKeyboardShortcut(['f3','mod+3'], () => {
        player.speed('down');
    });
    addKeyboardShortcut(['f4','mod+4'], () => {
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
            time : document.querySelector('#player-time'),
            hours: true
        });
        document.querySelector('#player-time').style.display = 'block';
    } else {
        document.querySelector('#player-time').style.display = 'none';
    }
    
    player.onPlayPause(status => {
        if (status === 'playing'){
            $playPauseButton.addClass('playing');
        } else {
            $playPauseButton.removeClass('playing');
        }
    });
    
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
    
    addKeyboardShortcut( 'mod+b', () => document.execCommand('bold',false,null)       );
    addKeyboardShortcut( 'mod+i', () => document.execCommand('italic',false,null)     );
    addKeyboardShortcut( 'mod+u', () => document.execCommand('underline',false,null)  );
    addKeyboardShortcut( 'mod+j', () => insertTimestamp()                             );
    addKeyboardShortcut( 'mod+0', () => {
        const player = getPlayer();
        player.skipTo( 0 );
    });
}



