/******************************************
                Timestamp
******************************************/

function saveText(){
    var field = document.getElementById("textbox");
    // load existing autosave (if present)
    if ( localStorage.getItem("autosave")) {
       field.innerHTML = localStorage.getItem("autosave");
    }
    // autosave every second - but wait five seconds before kicking in
    setTimeout(function(){
        setInterval(function(){
           localStorage.setItem("autosave", field.innerHTML);
        }, 1000);
    }, 5000);
}

function loadFileName(){
    // load existing file name
    if ( localStorage.getItem("lastfile") ) {
       document.getElementById("lastfile").innerHTML = "Last file: "+localStorage.getItem("lastfile");
       toggleAbout();
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
