oT.input = {};

oT.input.setup = function(){
    var input = new oTinput({
        element: '.file-input-wrapper-2',
        onFileChange: function(file){
            oT.media.create( { file: file } );
            adjustPlayerWidth();
            oT.input.saveFileDetails(file.name);
        },
        onFileError: function(err, file){
            var msg = document.webL10n.get('format-warn');
            msg = msg.replace('[file-format]',file.type.split("/")[1]);
            $('#formats').html(msg).addClass('warning');
        },
        onURLSubmit: function(url){
            oT.media.create( {file: url} );
            $('.input').removeClass('ext-input');
        },
        onURLError: function(error){
            var msg = document.webL10n.get('youtube-error');
            $('.ext-input-warning').text(msg).show();
        },
        onDragover: function(){
            $('.file-input-wrapper').addClass('hover');
        },
        onDragleave: function(){
            $('.file-input-wrapper').removeClass('hover');
        },
        text: {
            button: '<i class="fa fa-arrow-circle-o-up"></i>'+document.webL10n.get('choose-file'),
            altButton: document.webL10n.get('choose-youtube'),
            altInputText: document.webL10n.get('youtube-instrux'),
            closeAlt: '<i class="fa fa-times"></i>'
        }
    });

    oT.input.setFormatsMessage( input.getSupportedFormats() );
}

oT.input.setFormatsMessage = function(formats){
    var text = document.webL10n.get('formats');
    text = text.replace("[xxx]", formats.audio.join('/') );
    text = text.replace("[yyy]", formats.video.join('/') );
    document.getElementById("formats").innerHTML = text;
}

oT.input.loadPreviousFileDetails = function(){
    if ( localStorage.getItem("oT-lastfile") ) {
        var lastFile = JSON.parse( localStorage.getItem("oT-lastfile") );
        var lastfileText = document.webL10n.get('last-file');
        if (lastFile.name === undefined) {
            document.getElementById("lastfile").innerHTML = lastfileText+' '+lastFile;
        } else if (lastFile.source === '') {
            document.getElementById("lastfile").innerHTML = lastfileText+' '+lastFile.name;
        } else {
            var el = document.getElementById("lastfile");
            el.innerHTML = lastfileText+' <span class="media-reload">'+lastFile.name+'</span>';
            el.addEventListener('click',function(){ 
                oT.input.processYoutube( lastFile.source );
            });
        }
    }    
}

oT.input.saveFileDetails = function(fileDetails){
    var obj = fileDetails;
    if (typeof file === 'string') {
        obj = {
            name: fileDetails,
            source: ''
        }
    }
    localStorage.setItem("oT-lastfile", JSON.stringify( obj ));
}

oT.input.show = function(){
    $('.topbar').addClass('inputting');
    $('.input').addClass('active');
    $('.sbutton.time').removeClass('active');
    $('.text-panel').removeClass('editing');
    
}


oT.input.hide = function(){
    $('.topbar').removeClass('inputting');
    $('.input').removeClass('active');
    $('.sbutton.time').addClass('active');
    $('.text-panel').addClass('editing');
};
