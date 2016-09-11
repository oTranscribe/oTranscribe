
/******************************************
                Other
******************************************/

function html5Support(){
    var audioTagSupport = !!(document.createElement('audio').canPlayType);
    var contentEditableSupport = document.getElementById('textbox').contentEditable;
    var fileApiSupport = !!(window.FileReader);

    if (audioTagSupport && contentEditableSupport && fileApiSupport){
        return true;
    } else {
        return false;
    }
}

export default function oldBrowserCheck(){
    if ( html5Support() === false ){
        var oldBrowserWarning = document.webL10n.get('old-browser-warning');
        document.getElementById('old-browser').innerHTML = oldBrowserWarning;
    }
}
