oT.lang = {};

oT.lang.setLang = function(lang){
    if (lang){
        localStorage.setItem('oTranscribe-language',lang);
        window.location.reload();
    }
}

oT.lang.applyLang = function(){
    var lang = localStorage.getItem('oTranscribe-language');
    console.log(lang);
    document.webL10n.setLanguage(lang);
}

window.oT.lang = oT.lang;