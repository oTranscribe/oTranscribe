/******************************************
               Timestamp
******************************************/


oT.timestamp = {
    split: function(hms){
        var a = hms.split(':');
        var seconds = (+a[0]) * 60 + (+a[1]); 
        return seconds;
    },
    get: function(){
        // get timestap
        if (!oT.player || !oT.player.getTime) {
            return false;
        }
        var time = oT.player.getTime();
        var minutes = Math.floor(time / 60);
        var seconds = ("0" + Math.floor( time - minutes * 60 ) ).slice(-2);
        return minutes+":"+seconds;
    },
    insert: function(){
        var time = oT.timestamp.get();
        if (time) {
            document.execCommand('insertHTML',false,
            '<span class="timestamp" contenteditable="false" data-timestamp="' + oT.timestamp.get() + '" >' + oT.timestamp.get() + '</span>&nbsp;'
            );
            oT.timestamp.activate();
        }
    },
    activate: function(){
        $('.timestamp').each(function( index ) {
            $( this )[0].contentEditable = false;
            $( this ).off().click(function(){
                var time = $( this ).attr('data-timestamp') || $(this).text();
                oT.player.skipTo( oT.timestamp.split(time) );
            })
        });
    }
}

// backwards compatibility, as old timestamps use setFromTimestamp() and ts.setFrom()
function setFromTimestamp(clickts, element){
    ts.setFrom(clickts, element);
}
var ts = {
    setFrom: function(clickts, element){
        if (element.childNodes.length == 1) {
            oT.player.skipTo( oT.timestamp.split(clickts) );
        }
    }
}



