oT.lang = {};

oT.lang.setLang = function(lang){
    if (lang){
        localStorage.setItem('oTranscribe-language',lang);
        window.location.reload();
    }
}

oT.lang.applyLang = function(){
    var lang = localStorage.getItem('oTranscribe-language');
    document.webL10n.setLanguage(lang);
}

oT.lang.togglePanel = function(){
    $('.language-picker').toggle();
    $('.text-panel').toggle();
    $('.language-title').toggleClass('active');
}

window.oT.lang = oT.lang;