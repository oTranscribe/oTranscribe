oT.lang = {};

oT.lang.langs = {
    'english': 'English',
    'pirate': 'Pirate',
    'es': 'Español',
    'fr': 'Français'
}

oT.lang.setLang = function(lang){
    if (lang){
        localStorage.setItem('oTranscribe-language',lang);
        window.location.reload();
    }
}

oT.lang.applyLang = function(callback){
    var lang = localStorage.getItem('oTranscribe-language') || navigator.language.substr(0,2);
    document.webL10n.setLanguage(lang);
    $('#curr-lang').text( oT.lang.langs[document.webL10n.getLanguage()] );
    setTimeout(function(){
        callback();        
    },1000);
}

oT.lang.togglePanel = function(){
    $('.language-picker').toggleClass('active');
    $('.language-title').toggleClass('active');
}

oT.lang.buildPanel = function(){
    for (var i = 0; i < oT.lang.langs.length; i++) {
        var l = oT.lang.langs[i];
    }
}

window.oT.lang = oT.lang;