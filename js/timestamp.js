/******************************************
                Timestamp
******************************************/

// get timestamp
// var timestamp;


function saveText(){
    // autosave every second
    var field = document.getElementById("textbox");
    if ( localStorage.getItem("autosave")) {
       field.innerHTML = localStorage.getItem("autosave");
    }
    setInterval(function(){
       localStorage.setItem("autosave", field.innerHTML);
    }, 1000);
    
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
