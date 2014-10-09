oT.import = {}

oT.import.loadFile = function( file ){

    file = JSON.parse(file);
    var text = file.text;
    console.log(file);
    
    oT.import.replaceTranscriptTextWith(text);
    console.log(text);
}

oT.import.replaceTranscriptTextWith = function( newText ){
    
    // TODO: CLEAN STRING
    newText = oT.import.clean(newText);
    
    var textbox = document.getElementById("textbox");
    if (typeof newText === 'string') {
        textbox.innerHTML = newText;
    } else {
        textbox.innerHTML = '';
        textbox.appendChild(newText);    
    }
}

oT.import.localButtonReaction = function( input ){
    var file = input.files[0];
    
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(e) { 
        var contents = e.target.result;
        oT.import.loadFile( contents );
    }
    
    
}

oT.import.clean = function(text){
    text = text.replace('<text>','');
    text = text.replace('</text>','');
    return text;
}
