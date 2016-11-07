const $ = require('jquery');

export default function( msg ) {
    $('.message-panel .message-content').html( msg );
    var $panel = $('.message-panel');
    var $textbox = $('#textbox');
    $panel.removeClass('hidden');
    let stickyWatch = setInterval(function(){
        if ( $textbox.offset().top < 0 ) {
            $panel.css('margin-left', $panel.css('margin-left') );
            $panel.addClass('stuck');
        } else {
            $panel.removeClass('stuck');
        }
    },50);
    
    $('.close-message-panel').click(function(){
        close();
    });
    
    function close() {
        $('.message-panel').addClass('hidden');
        clearInterval(stickyWatch);
    }  
}

