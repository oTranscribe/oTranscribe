/******************************************
                 Export
******************************************/

var exportText = {
    md : function(){
        var p = document.getElementById('textbox').innerHTML;
        var clean = $.htmlClean(p, {format:true, removeTags: ["div", "span", "img", "pre"]});
        var x = toMarkdown( clean );   
        return x.replace(/\t/gm,"");           
    },
    txt : function() {
        var p = document.getElementById('textbox').innerHTML;
        var clean = $.htmlClean(p, {format:true, removeTags:["div", "span", "img", "em", "strong", "p"]});
        return clean.replace(/\t/gm,"");
    },
    utf8_to_b64 : function( str ) {
        return window.btoa(unescape(encodeURIComponent( str )));
    },
    // element choose element to append button to
    mdButton : function(element) {
        var md = exportText.md();
        var a = document.getElementById('x-md');
        a.download = exportText.name() + ".md";
        a.href = "data:text/plain;base64," + exportText.utf8_to_b64( md );
    },
    txtButton : function(element) {
        var txt = exportText.txt();
        var a = document.getElementById('x-txt');
        a.download = exportText.name() + ".txt";
        a.href = "data:text/plain;base64," + exportText.utf8_to_b64( txt );
    },
    name : function(){
        var d = new Date();
        return "Transcript exported " + d.toUTCString();
    }
}

function placeExportPanel(){
    exportText.mdButton();
    exportText.txtButton();
        
    var origin = $('#icon-exp').offset();
    var right = parseInt( $('body').width() - origin.left - 35 );
    var top = parseInt( origin.top ) + 50;
    $('.export-panel')
        .css({'right': right,'top': top})
        .addClass('active'); 
}

function hideExportPanel(){
    $('.export-panel').removeClass('active');
    
}
