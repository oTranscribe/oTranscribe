oT.message = {}

oT.message.header = function(msg){
    $('.message-panel .message-content').html( msg );
    var $panel = $('.message-panel');
    $panel.removeClass('hidden');
    oT.message.stickyWatch = setInterval(function(){
        if ( $panel.offset().top < 30 ) {
            $panel.css('margin-left', $panel.css('margin-left') );
            $panel.addClass('stuck');
        } else if (!$panel.hasClass('stuck')) {
            $panel.removeClass('stuck');
        }
    },50);
}

oT.message.close = function(){
    $('.message-panel').addClass('hidden');
    clearInterval(oT.message.stickyWatch);
}

