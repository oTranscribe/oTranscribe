/******************************************
                 Export
******************************************/

var exportText = {
    md : function(){
        var p = document.getElementById('textbox').innerHTML;
        var clean = $.htmlClean(p, {format:true, removeTags: ["div", "span", "img"]});
        var x = toMarkdown( clean );   
        return x.replace(/\t/gm,"");
           
    },
    utf8_to_b64 : function( str ) {
        return window.btoa(unescape(encodeURIComponent( str )));
    },
    // element choose element to append button to
    mdButton : function(element) {
        var md = exportText.md();
        var a = element.appendChild(
                document.createElement("a")
            );
        a.download = exportText.name() + ".md";
        a.href = "data:text/plain;base64," + exportText.utf8_to_b64( md );
        a.innerHTML = "download example text";        
    },
    name : function(){
        var d = new Date();
        return "Transcript exported " + d.toUTCString();
    }
}

function placeExportPanel(){
    var origin = $('#icon-exp').offset();
    var right = parseInt( $('body').width() - origin.left - 35 );
    var top = parseInt( origin.top ) + 75;
    $('.export-panel')
        .css({'right': right,'top': top})
        .addClass('active'); 
}

placeExportPanel();