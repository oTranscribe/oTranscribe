const $ = require('jquery');

var languages = {
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
    'sv': 'Svenska',
	'vi': 'Tiếng Việt',   // Vietnamese
    'tr': 'Türkçe',       // Turkish
    'ru': 'Русский',       // Russian
    'el': 'Ελληνικά'       // Greek
};

function setLang(lang){
    if (lang){
        localStorageManager.setItem('oTranscribe-language',lang);
        window.location.reload();
    }
};
function applyLang(callback){
    var lang = localStorageManager.getItem('oTranscribe-language');
    if(lang) {
        document.webL10n.setLanguage(lang);
    } else {
        document.webL10n.setLanguage('en');
    }
}

function bide(){
    if (document.webL10n.getReadyState() === 'complete' ) {
        applyLang();
        addMarkup();
    } else {
        setTimeout(function(){
            bide();
        },50);
    }
}

function addMarkup(){
    var buttons = Object.keys(languages)
        .sort()
        .map(function(code) {
            var fullName = languages[code];
            return '<div class="language-button" data-language="'+code+'">'+fullName+'</div>';
        });

    $('.language-picker .container').html( buttons.join(' ') );

    $('.language-button').click(function(){
       setLang( $(this).data('language') );
    });

    $('#curr-lang').text( languages[document.webL10n.getLanguage()] );

    $('.language-title').mousedown(function(){
        $('.language-picker').toggleClass('active');
        $('.language-title').toggleClass('active');
    });



}

export default bide;
