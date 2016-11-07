import showMessage from './message-panel';
const $ = require('jquery');
import {setEditorContents} from './texteditor';

export default function() {
    $('#local-file-import').change(reactToInput);
}

function loadFile( fileRaw ){
    try {
        const file = JSON.parse(fileRaw); 
        setEditorContents(file.text);
        remindOfMediaFile(file.media, file['media-source'], file['media-time']);
    } catch (e) {
        console.warn(e);
        showMessage('This is not a valid oTranscribe format (.otr) file.');
    }
}


function remindOfMediaFile( filename, filesource, filetime ){
    if (filename && filename !== '') {
        var lastfileText = document.webL10n.get('last-file');
        var lastfileText = 'File last used with imported document:';
        var restoreText = 'Restore';
        // if ((filesource) && (oTplayer.parseYoutubeURL(filesource))) {
        //     showMessage( lastfileText+' <a href="#" id="restore-media">'+filename+'</a>' );
        //     $('#restore-media').click(function(){
        //         oT.media.create({file: filesource, startpoint: filetime});
        //         return false;
        //     });
        // } else {
            showMessage(lastfileText+' '+filename);
        // }
    }
}

function reactToInput(){
    let input = this;
    var file = input.files[0];
    
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(e) { 
        var contents = e.target.result;
        loadFile( contents );
    }
    
    input.value = '';
    
    
}
