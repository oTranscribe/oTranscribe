oT.message = {}

oT.message.header = function(msg){
    $('.message-panel .message-content').html( msg );
    $('.message-panel').removeClass('hidden');
}

oT.message.close = function(){
    $('.message-panel').addClass('hidden');
}

