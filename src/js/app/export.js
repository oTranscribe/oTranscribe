const $ = require('jquery');
const Mustache = require('mustache');
const toMarkdown = require('to-markdown');
const JSONLint = require('json-lint');
const template = require('raw-loader!../../html/export-panel.ms');
import googleDriveSetup from './export-formats/google-drive';
import { getPlayer } from './player/player';
const sanitizeHtml = require('sanitize-html');
import { cleanHTML } from './clean-html';
import { parseJSON } from './annotations';

function getTexteditorContents() {
    return document.querySelector('#textbox').innerHTML;
}

function getFilename() {
    var fileName = localStorageManager.getItem('oT-lastfile') + "_" + (new Date()).toUTCString();
    return fileName.trim().replace('"', "").replace(/\s+/g, "_");
};

let exportFormats = {
    download: [],
    send: []
};

exportFormats.download.push({
    name: 'JSON',
    extension: 'json',
    fn: (txt) => {
        const fullyClean = sanitizeHtml(txt, {
            allowedTags: [ 'p', 'em', 'strong', 'i', 'b', 'br' ]
        });
        var md = toMarkdown( fullyClean );
        md = md.replace(/,*\s*}/g, "\n},");
        md = ("[" + md + "]")
        md = md.replace(/}\s*,\s*\]/g, "}]")
        md = md.replace(/^\s*/mg, "");
        var JSONChecked = JSONLint(md, {comments: false});
        if(JSONChecked.error) {
            var alertString = "JSON Error: " + JSONChecked.error + "\n";
            var errorPart = JSONChecked.evidence.replace(/^\s*\d+\|\s*/mg, "   ");
            errorPart = errorPart.replace(/^\s*->*\s*\d+\|\s*/mg, "->");
            alertString += errorPart;
            alert(alertString);
            return null;
        }
        md = md.replace(/\s/g, " ");
        var JSONValid = parseJSON(md);
        if(JSONValid.status == false) {
            var alertString = "JSON Error: ";
            alertString += JSONValid.error;
            alert(alertString);
            return null;
        }
        return md.replace(/\t/gm,"");
    }
});

exportFormats.download.push({
    name: 'Plain text',
    extension: 'txt',
    fn: (txt) => {
        const fullyClean = sanitizeHtml(txt, {
            allowedTags: [ 'p' ]
        });
        const md = toMarkdown( fullyClean );
        return md.replace(/\t/gm,"");
    }
});

exportFormats.download.push({
    name: 'Markdown',
    extension: 'md',
    fn: (txt) => {
        const fullyClean = sanitizeHtml(txt, {
            allowedTags: [ 'p', 'em', 'strong', 'i', 'b', 'br' ]
        });
        const md = toMarkdown( fullyClean );
        return md.replace(/\t/gm,"");
    }
});

exportFormats.download.push({
    name: 'Plain text',
    extension: 'txt',
    fn: (txt) => {
        const fullyClean = sanitizeHtml(txt, {
            allowedTags: [ 'p' ]
        });
        const md = toMarkdown( fullyClean );
        return md.replace(/\t/gm,"");
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

    var downloadData = exportFormats.download.map(format => {
        const clean = cleanHTML( getTexteditorContents() );
        const file = format.fn(clean);
        const blob = new Blob([file], {type: 'data:text/plain'});
        const href = window.URL.createObjectURL(blob);

        return {
            format: format,
            file: file,
            href: href,
            filename: getFilename()
        };
    });

    downloadData = downloadData.filter(format => {
        return format.file != null;
    });


    if (checkDownloadAttrSupport() === false) {
        downloadData.forEach(format => {
            format.href = convertToBase64(format.file);
        });
    }

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

        const filename = getFilename();
        const data = {
            text: document.querySelector('#textbox').innerHTML,
            filename: filename
        };

        $('.export-panel')
            .html(generateButtons(filename));

        exportFormats.send.forEach(format => {

            if (format.ready) {
                format.fn(data);
            } else {
                format.setup(() => {
                    format.ready = true;
                    setTimeout(() => {
                        format.fn(data)
                    }, 500);
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

function checkDownloadAttrSupport() {
    var a = document.createElement('a');
    return (typeof a.download != "undefined");
}

function convertToBase64(str) {
    return "data:application/octet-stream;base64," + btoa(str);
}
