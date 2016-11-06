const $ = require('jquery');
const Mustache = require('mustache');
$.htmlClean = p => p;
const toMarkdown = require('to-markdown');
const template = require('raw!../../html/export-panel.ms');
import googleDriveSetup from './export-formats/google-drive';
import { getPlayer } from './player/player';


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

exportFormats.download.push({
    name: 'oTranscribe format',
    extension: 'otr',
    fn: (txt) => {
        let result = {};
        result.text = txt.replace('\n','');
        const player = getPlayer();
        if (player){
            result.media = player.getName();
            result['media-time'] = player.getTime();
            // if (oT.media.ytEl) {
            //     result['media-source'] = oT.media._ytEl.getVideoUrl();
            // } else {
            //     result['media-source'] = '';
            // }
        } else {
            result.media = '';
            result['media-source'] = '';
            result['media-time'] = '';
        }
        return JSON.stringify(result);
    }
});

exportFormats.send.push({
    name: 'Google Drive',
    setup: function(cb) {
        this.checkGoogleAuth = googleDriveSetup(cb);
    },
    fn: function(opts) {
        this.checkGoogleAuth(opts);
    }
})

function generateButtons(filename) {
    
    const downloadData = exportFormats.download.map(format => {
        const raw = document.querySelector('#textbox').innerHTML;
        const file = format.fn(raw);
        const href = "data:text/plain;base64," + window.btoa(unescape(encodeURIComponent( file )));
        return {
            format: format,
            file: format.fn(raw),
            href: href,
            filename: filename
        };
    });    
  
    return Mustache.render(template, {
        downloads: downloadData
    });
    
}

export function exportSetup(){
    
    $('.textbox-container').click(function(e) {
        if(
            $(e.target).is('#icon-exp') ||
            $(e.target).is('.export-panel') ||
            $(e.target).is('.sbutton.export')
        ){
            e.preventDefault();
            return;
        }
        hideExportPanel();
    });    
    
    $(".export-panel").click(function(e) {
         e.stopPropagation();
    });
    
    $('.sbutton.export').click(function() {
        // document.querySelector('.container').innerHTML = downloadButtons;
        var origin = $('#icon-exp').offset();
        var right = parseInt( $('body').width() - origin.left + 25 );
        var top = parseInt( origin.top ) - 50;
        
        const filename = document.webL10n.get('file-name') + " " + (new Date()).toUTCString();
        const data = {
            text: document.querySelector('#textbox').innerHTML,
            filename: filename
        };
        
        $('.export-panel')
            .html(generateButtons(filename))

        exportFormats.send.forEach(format => {

            if (format.ready) {
                format.fn(data);
            } else {
                format.setup(() => {
                    setTimeout(() => {
                        format.fn(data)
                        format.ready = true;
                    }, 10);
                });
            }
        });

        $('.export-panel')
            .css({'right': right,'top': top})
            .addClass('active'); 
        
    });
}

function hideExportPanel(){
    $('.export-panel').removeClass('active');
}
