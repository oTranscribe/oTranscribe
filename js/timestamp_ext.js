/******************************************
               Timestamp
******************************************/


var ts = {
    split : function(hms){
        var a = hms.split(':');
        var seconds = (+a[0]) * 60 + (+a[1]); 
        return seconds;
    },
    setFrom : function(clickts, element){
        console.log(element.childNodes.length);
        if (element.childNodes.length == 1) {
            document.getElementById('audio').currentTime = ts.split(clickts);
        }
    },
    get : function(){
        // get timestap
        var time = document.getElementById('audio').currentTime  
        var minutes = Math.floor(time / 60);
        var seconds = ("0" + Math.round( time - minutes * 60 ) ).slice(-2);
        return minutes+":"+seconds;
    },
    insert : function(){
        document.execCommand('insertHTML',false,
        '<span class="timestamp" contenteditable="false" onclick="var x = this; ts.setFrom(\'' + ts.get() + '\', x);">' + ts.get() + '</span>&nbsp;'
        );
        $('.timestamp').each(function( index ) {
            $( this )[0].contentEditable = false;
        });
    }
}

// backwards compatibility, as old timestamps use setFromTimestamp()
function setFromTimestamp(clickts, element){
    ts.setFrom(clickts, element);
}




