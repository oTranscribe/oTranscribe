const $ = require('jquery');
$.htmlClean = p => p;
const toMarkdown = require('to-markdown');


/******************************************
                 Export
******************************************/

let exportFormats = {
    download: [],
    send: []
};

exportFormats.download.push({
    name: 'Markdown',
    extension: 'md',
    fn: (txt) => {
        var clean = $.htmlClean(txt, {format:true, removeTags: ["div", "span", "img", "pre", "text"]});
        var x = toMarkdown( clean );   
        return x.replace(/\t/gm,"");           
    }
});

exportFormats.download.push({
    name: 'Plain text',
    extension: 'txt',
    fn: (txt) => {
        var clean = $.htmlClean(txt, {format:true, removeTags:["div", "span", "img", "em", "strong", "p", "pre", "text"]});
        return clean.replace(/\t/gm,"");
    }
});

/*
exportFormats.download.push({
    name: 'oTranscribe format',
    extension: 'otr',
    fn: (txt) => {
        let result = {};
        result.text = txt.replace('\n','');
        if (oT.player !== null){
            result.media = oT.player.title;
            if (oT.player.getTime) {
                result['media-time'] = oT.player.getTime();
            }
            if (oT.media.ytEl) {
                result['media-source'] = oT.media._ytEl.getVideoUrl();
            } else {
                result['media-source'] = '';
            }
        } else {
            result.media = '';
            result['media-source'] = '';
            result['media-time'] = '';
        }
        const doc = JSON.stringify(result);
        return "data:text/plain;base64," + exportText.utf8_to_b64( doc );
    }
});
*/

function generateDownloadButtons() {
    return exportFormats.download.map(format => {
        const fileName = document.webL10n.get('file-name') + " " + (new Date()).toUTCString();
        const raw = document.querySelector('#textbox').innerHTML;
        const file = format.fn(raw);
        const href = "data:text/plain;base64," + window.btoa(unescape(encodeURIComponent( file )));
        return `<a class="export-block-md" target="_blank" href="${href}" download="${fileName}.${format.extension}">${format.name} (.${format.extension})</a>`;
    }).join('');

    
}

export function exportSetup(){
    // gd.handleClientLoad();
        
    $('.sbutton.export').click(function() {
        // document.querySelector('.container').innerHTML = downloadButtons;
        var origin = $('#icon-exp').offset();
        var right = parseInt( $('body').width() - origin.left + 25 );
        var top = parseInt( origin.top ) - 50;
        
        const downloadButtons = generateDownloadButtons();
        const exportPanelHTML = `
        <div class="export-title" data-l10n-id="export-download">Download transcript as...</div>
        ${downloadButtons}
        <div class="export-title" data-l10n-id="export-send">Send transcript to...</div>
        <a class="export-block-gd unauth" id="x-gd" target="_blank" href="javascript:void(0);">
            Google Drive
            <div class="sign-in" data-l10n-id="sign-in" id="x-gd-sign">Sign in</div>
        </a>`;
    
        
        $('.export-panel')
            .html(exportPanelHTML)
            .css({'right': right,'top': top})
            .addClass('active'); 
        
    })
}

function hideExportPanel(){
    $('.export-panel').removeClass('active');
    $('.export-block-gd')[0].outerHTML = gd.button();
}

/*
// GOOGLE DRIVE EXPORT STUFF

exportText.createBlob = function(){
    var p = document.getElementById('textbox').innerHTML;
    var aFileParts = [p];
    var oBlob = new Blob(aFileParts, {type : 'text/html'}); // the blob
    return oBlob;
}

exportText.reader= function(){
    var reader = new FileReader();
    var blob = exportText.createBlob();
    reader.readAsBinaryString(blob);
    return reader;
}
*/


