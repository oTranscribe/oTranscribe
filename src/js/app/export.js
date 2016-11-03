const $ = require('jquery');
const Mustache = require('mustache');
$.htmlClean = p => p;
const toMarkdown = require('to-markdown');
const template = require('raw!../../html/export-panel.ms');


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

function generateButtons() {
  
    const downloadData = exportFormats.download.map(format => {
        const fileName = document.webL10n.get('file-name') + " " + (new Date()).toUTCString();
        const raw = document.querySelector('#textbox').innerHTML;
        const file = format.fn(raw);
        const href = "data:text/plain;base64," + window.btoa(unescape(encodeURIComponent( file )));
        return {
            format: format,
            file: format.fn(raw),
            href: href,
            fileName: fileName
        };
    })
  
    return Mustache.render(template, {
        downloads: downloadData
    });
    
}

export function exportSetup(){
    // gd.handleClientLoad();
        
    $('.sbutton.export').click(function() {
        // document.querySelector('.container').innerHTML = downloadButtons;
        var origin = $('#icon-exp').offset();
        var right = parseInt( $('body').width() - origin.left + 25 );
        var top = parseInt( origin.top ) - 50;
        
        const exportPanelHTML = generateButtons();
        
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


