oT.lang = {};

oT.lang.langs = {
    'en': 'English',
    'pirate': 'Pirate',
    'es': 'Español',
    'de': 'Deutsch',
    'fr': 'Français',
    'nl': 'Nederlands',
    'pl': 'Polski',
    'zh-hant': '繁體中文',
    'zh-hans': '简体中文',
    'ja': '日本語',
    'pt': 'Português',
    'ptbr': 'Português do Brasil',
    'ca': 'Català',
    'it': 'Italiano',
    'da': 'Dansk',
    'id': 'Indonesia',
    'uk': 'Українська'
}

oT.lang.setLang = function(lang){
    if (lang){
        localStorageManager.setItem('oTranscribe-language',lang);
        window.location.reload();
    }
}

oT.lang.applyLang = function(callback){
    var lang = localStorageManager.getItem('oTranscribe-language');
    if(lang) {
        document.webL10n.setLanguage(lang);
    } else {
        document.webL10n.setLanguage('en');
    }
}

oT.lang.togglePanel = function(){
    $('.language-picker').toggleClass('active');
    $('.language-title').toggleClass('active');
}

oT.lang.bide = function(){
    if (document.webL10n.getReadyState() === 'complete' ) {
        oT.lang.applyLang();
    } else {
        setTimeout(function(){
            oT.lang.bide();
        },50);
    }
}

window.oT.lang = oT.lang;