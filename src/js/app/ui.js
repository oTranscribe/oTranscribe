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
    
    $('.skip-backwards').mousedown(function(){
        player.skip('backwards');
        skippingButtonInterval = setInterval(function(){
            player.skip('backwards');
        },100);
    }).mouseup(function(){
        clearInterval(skippingButtonInterval);
    });
    $('.skip-forwards').mousedown(function(){
        player.skip('forwards');    
        skippingButtonInterval = setInterval(function(){
            player.skip('forwards');
        },100);
    }).mouseup(function(){
        clearInterval(skippingButtonInterval);
    });
    
    $playPauseButton.click(playPause);
    addKeyboardShortcut('escape', playPause)
    
    let changingSpeed = false;
    $('.speed-slider')
        .attr('min', player.minSpeed)
        .attr('max', player.maxSpeed)
        .attr('step', player.speedIncrement)
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
    $( ".speed" ).mousedown(function() {
        if ($('.speed-box').not(':hover').length) {
            $(this).toggleClass('fixed');
        }    
    });

    const playerHook = document.querySelector('#player-hook');
    playerHook.innerHTML = '';
    var progressBar = new Progressor({
        media : document.querySelector('audio, video'),
        bar : playerHook,
        text : filename,                       
        time : document.querySelector('#player-time')
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

function addKeyboardShortcut(key, fn) {
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
}

function oldSetup() {

    var keyboardShortcuts = [
        [ 'mod+s',       function(){  oT.backup.save();                              }]
    ];
    
    $.each(keyboardShortcuts, function(i,m){
        Mousetrap.bind(m[0], function(e) {
            if (e.preventDefault) {
                e.preventDefault();
            } else {
                // internet explorer
                e.returnValue = false;
            }
            m[1]();
            return false;
        });
    });
    
    $('.sbutton.backup').click(function(){
        oT.backup.openPanel();
    });
        
    $('.backup-close').click(function(){
        oT.backup.closePanel();
    });
    
};



