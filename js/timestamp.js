/******************************************
                Timestamp
******************************************/

function loadFileName(){
    // load existing file name
    if ( localStorage.getItem("lastfile") ) {
        var lastfileText = document.webL10n.get('last-file');
       document.getElementById("lastfile").innerHTML = lastfileText+" "+localStorage.getItem("lastfile");
    }    
}

function dragListener(){
    var button = $('.file-input-wrapper')[0];
    button.addEventListener('dragover', function(){
        $('.file-input-wrapper').addClass('hover');
    }, false);
    button.addEventListener('dragleave', function(){
        $('.file-input-wrapper').removeClass('hover');
    }, false);
    
}
