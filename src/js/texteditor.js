/******************************************
               Text editor
******************************************/

oT.texteditor = {}

oT.texteditor.clean = function( html ){
    var result = $.htmlClean(html, {
        format: false,
        allowedTags: ['p', 'div', 'strong', 'em', 'i', 'b', 'span', 'br'],
        allowedAttributes: [['class',['span']],['data-timestamp',['span']]],
        allowedClasses: ['timestamp']
    });
    return result;
}


function adjustPlayerWidth(){
    var cntrls = $('.controls');
    
    var gap = $(window).width() - (cntrls.width() + $('.title').outerWidth()  + $('.help-title').outerWidth() + $('.language-title').outerWidth()  );
    $('#player-hook').width( $('#player-hook').width()+gap -10 );
}


function toggleAbout(){
    $('.help-title').removeClass('active');
    $('.help').removeClass('active');
    $('.title').toggleClass('active');
    $('.about').toggleClass('active');
}

function toggleHelp(){
    $('.title').removeClass('active');
    $('.about').removeClass('active');
    $('.help-title').toggleClass('active');
    $('.help').toggleClass('active');
}


function adjustEditorHeight(){
    $('.textbox-container').height( window.innerHeight - 36 );
}

function placeTextPanel(){
   var position = parseInt( $('#textbox').offset().left, 10) + 700;
   $('.text-panel').css('left', position);
}

function countWords(str){
    var trimmedStr = $.trim(str);
    if (trimmedStr){
        return trimmedStr.match(/\S+/gi).length;
    }
    return 0;
}

function countTextbox(){
    var textboxElement = document.getElementById('textbox');
    var textboxText = textboxElement.innerText || textboxElement.textContent;
    var count = countWords(textboxText);
 
    document.getElementById('wc').innerHTML = count;
    
    var wordcountText = document.webL10n.get('wordcount', {n: count});
    document.querySelector('.wc-text').innerHTML = wordcountText;
}

function initWordCount(){
    setInterval(function(){
        countTextbox();
    }, 1000);
    
}


function watchFormatting(){
    var b = document.queryCommandState("Bold");
    var bi = document.getElementById("icon-b");
    var i = document.queryCommandState("italic");
    var ii = document.getElementById("icon-i");
    
    if (b === true){
        bi.className = "fa fa-bold active"
    } else {
        bi.className = "fa fa-bold"
    }
    if (i === true){
        ii.className = "fa fa-italic active"
    } else {
        ii.className = "fa fa-italic"
    }
}

function initWatchFormatting(){
    setInterval(function(){
        watchFormatting();
    }, 100);
}


