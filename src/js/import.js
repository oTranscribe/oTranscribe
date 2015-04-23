oT.import = {}

oT.import.loadFile = function( file ){
    
    try {
        file = JSON.parse(file);    
        oT.import.replaceTranscriptTextWith(file.text);
        oT.import.remindOfMediaFile(file.media, file['media-source'], file['media-time']);
    } catch (e) {
        alert('This is not a valid oTranscribe format (.otr) file.');
    }
}

oT.import.replaceTranscriptTextWith = function( newText ){
    
    // TODO: CLEAN STRING
    newText = oT.import.clean(newText);
    
    var $textbox = $("#textbox");
    
    $textbox.fadeOut(300,function(){
        if (typeof newText === 'string') {
            $textbox[0].innerHTML = newText;
        } else {
            textbox[0].innerHTML = '';
            $textbox[0].appendChild(newText);    
        }
        oT.timestamp.activate();
        $('.textbox-container').scrollTop(0)
        $(this).fadeIn(300);
    });
    
}

oT.import.remindOfMediaFile = function( filename, filesource, filetime ){
    if (filename && filename !== '') {
        // var lastfileText = document.webL10n.get('last-file');
        var lastfileText = 'File last used with imported document:';
        var restoreText = 'Restore';
        if ((filesource) && (oT.media.ytParse(filesource))) {
            oT.message.header( lastfileText+' <a href="#" id="restore-media">'+filename+'</a>' );
            $('#restore-media').click(function(){
                oT.media.create({file: filesource, startpoint: filetime});
                return false;
            });
        } else {
            oT.message.header(lastfileText+' '+filename);
        }
    }
}

oT.import.localButtonReaction = function( input ){
    var file = input.files[0];
    
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(e) { 
        var contents = e.target.result;
        oT.import.loadFile( contents );
    }
    
    input.value = '';
    
    
}

oT.import.clean = function(text){
    
    text = oT.texteditor.clean(text);
    
    return text;
}
