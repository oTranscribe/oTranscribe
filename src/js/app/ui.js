/******************************************
             User Interaction
******************************************/

var keyboardShortcuts = [
        [ 'escape',      function(){  oT.player.playPause();                         }],
        [['f1','mod+1'], function(){  oT.player.skip('backwards');                   }],
        [['f2','mod+2'], function(){  oT.player.skip('forwards');                    }],
        [['f3','mod+3'], function(){  oT.player.speed('down');                       }],
        [['f4','mod+4'], function(){  oT.player.speed('up');                         }],
        [ 'mod+j',       function(){  oT.timestamp.insert();                         }],
        [ 'mod+s',       function(){  oT.backup.save();                              }],
        [ 'mod+b',       function(){  document.execCommand('bold',false,null);       }],
        [ 'mod+i',       function(){  document.execCommand('italic',false,null);     }],
        [ 'mod+u',       function(){  document.execCommand('underline',false,null);  }]
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

    var skippingButtonInterval;
    $('.skip-backwards').mousedown(function(){
        oT.player.skip('backwards');
        skippingButtonInterval = setInterval(function(){
            oT.player.skip('backwards');
        },100);
    }).mouseup(function(){
        clearInterval(skippingButtonInterval);
    });
    $('.skip-forwards').mousedown(function(){
        oT.player.skip('forwards');    
        skippingButtonInterval = setInterval(function(){
            oT.player.skip('forwards');
        },100);
    }).mouseup(function(){
        clearInterval(skippingButtonInterval);
    });
    $('.button.reset').click(function(){
        oT.media.reset({input: true});    
    });

    $( ".speed" ).mousedown(function() {
        if ($('.speed-box').not(':hover').length) {
            $(this).toggleClass('fixed');
        }    
    });
    
    $('.title').mousedown(function(){
        toggleAbout();
    });
    
    $('#local-file-import').change(function() {
        oT.import.localButtonReaction(this);
    });        

    $('.sbutton.export').click(function() {
        placeExportPanel();
    });    
    
    $('.sbutton.backup').click(function(){
        oT.backup.openPanel();
    });
        
    $('.backup-close').click(function(){
        oT.backup.closePanel();
    });
    
    $('.textbox-container').click(function(e) {
        if(
            $(e.target).is('#icon-exp') ||
            $(e.target).is('.export-panel') ||
            $(e.target).is('.sbutton.export')
        ){
            e.preventDefault();
            return;
        }
        hideExportPanel();
    });    
    
    $(".export-panel").click(function(e) {
         e.stopPropagation();
    });
    
    $('.close-message-panel').click(function(){
        oT.message.close();
    })
    

// End UI



