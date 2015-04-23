/******************************************
                 Export
******************************************/

oT.export = {};

oT.export.asFormat = function( format ){
    if (format === 'md') {
        var p = document.getElementById('textbox').innerHTML;
        var clean = $.htmlClean(p, {format:true, removeTags: ["div", "span", "img", "pre", "text"]});
        var x = toMarkdown( clean );   
        return x.replace(/\t/gm,"");           
    } else if (format === 'txt') {
        var p = document.getElementById('textbox').innerHTML;
        var clean = $.htmlClean(p, {format:true, removeTags:["div", "span", "img", "em", "strong", "p", "pre", "text"]});
        return clean.replace(/\t/gm,"");
    } else if (format === 'html') {
        var p = document.getElementById('textbox').innerHTML;
        return p.replace('\n','');
    }
}

oT.export.placeButton = function ( format ){
    if (format === 'otr') {
        var doc = oT.export.createJsonFile();
        var a = document.getElementById('x-otr');
        a.download = exportText.name() + ".otr";
        a.href = "data:text/plain;base64," + exportText.utf8_to_b64( doc );
    }
}

var exportText = {
    utf8_to_b64 : function( str ) {
        return window.btoa(unescape(encodeURIComponent( str )));
    },
    // element choose element to append button to
    mdButton : function(element) {
        var md = oT.export.asFormat('md');
        var a = document.getElementById('x-md');
        a.download = exportText.name() + ".md";
        a.href = "data:text/plain;base64," + exportText.utf8_to_b64( md );
    },
    txtButton : function(element) {
        var txt = oT.export.asFormat('txt');
        var a = document.getElementById('x-txt');
        a.download = exportText.name() + ".txt";
        a.href = "data:text/plain;base64," + exportText.utf8_to_b64( txt );
    },
    name : function(){
        var d = new Date();
        var fileName = document.webL10n.get('file-name');
        return fileName + " " + d.toUTCString();
    }
}


function placeExportPanel(){
    exportText.mdButton();
    exportText.txtButton();
    oT.export.placeButton('otr');
    gd.handleClientLoad();
        
    var origin = $('#icon-exp').offset();
    var right = parseInt( $('body').width() - origin.left + 25 );
    var top = parseInt( origin.top ) - 50;
    $('.export-panel')
        .css({'right': right,'top': top})
        .addClass('active'); 
}

function hideExportPanel(){
    $('.export-panel').removeClass('active');
    $('.export-block-gd')[0].outerHTML = gd.button();
}

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


oT.export.createJsonFile = function(){
    var result = {};
    result.text = oT.export.asFormat('html');
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
    return JSON.stringify(result);
};
