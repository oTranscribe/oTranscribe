oT.message = {}

oT.message.header = function(msg){
    $('.message-panel .message-content').html( msg );
    var $panel = $('.message-panel');
    var $textbox = $('#textbox');
    $panel.removeClass('hidden');
    oT.message.stickyWatch = setInterval(function(){
        if ( $textbox.offset().top < 0 ) {
            $panel.css('margin-left', $panel.css('margin-left') );
            $panel.addClass('stuck');
        } else {
            $panel.removeClass('stuck');
        }
    },50);
}

oT.message.close = function(){
    $('.message-panel').addClass('hidden');
    clearInterval(oT.message.stickyWatch);
}

