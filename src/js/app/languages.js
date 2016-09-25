oT.lang = {};

oT.lang.langs = {
    'en': 'English',
    'es': 'Español',
    'de': 'Deutsch',
    'fr': 'Français',
    'nl': 'Nederlands',
    'pl': 'Polski',
    'zh-hant': '繁體中文',  // Traditional Chinese
    'zh-hans': '简体中文',  // Simplified Chinese 
    'ja': '日本語',         // Japanese
    'pt': 'Português',
    'ptbr': 'Português do Brasil',
    'ca': 'Català',
    'it': 'Italiano',
    'da': 'Dansk',
    'id': 'Indonesia',
    'uk': 'Українська',   // Ukrainian
    'ro': 'Română',
    'no': 'Norsk',        // Norweigan
    'fil': 'Filipino',
	'vi': 'Tiếng Việt',   // Vietnamese
    'ru': 'Русский'       // Russian
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
        oT.lang.addMarkup();
    } else {
        setTimeout(function(){
            oT.lang.bide();
        },50);
    }
}

oT.lang.addMarkup = function(){
    var buttons = Object.keys(oT.lang.langs)
        .sort()
        .map(function(code) {
            var fullName = oT.lang.langs[code];
            return '<div class="language-button" data-language="'+code+'">'+fullName+'</div>';
        });
    
    $('.language-picker .container').html( buttons.join(' ') );
    
    $('.language-button').click(function(){
       oT.lang.setLang( $(this).data('language') ); 
    });
    
}

window.oT.lang = oT.lang;