const $ = require('jquery');

export function inputSetup(opts) {
    
    var input = new oTinput({
        element: '.file-input-outer',
        onFileChange: function(file){
            opts.create(file);
            saveFileDetails(file.name);
            hide();
        },
        onFileError: function(err, file){
            var msg = document.webL10n.get('format-warn');
            msg = msg.replace('[file-format]',file.type.split("/")[1]);
            $('#formats').html(msg).addClass('warning');
        },
        onURLSubmit: function(url){
            input.showURLInput();
            opts.createFromURL(url);
            hide();
        },
        onURLError: function(error){
            var msg = document.webL10n.get('youtube-error');
            $('.ext-input-warning').text(msg).show();
        },
        onDragover: function(){
            $('.file-input-wrapper').addClass('hover');
        },
        onDragleave: function(){
            $('.file-input-wrapper').removeClass('hover');
        },
        text: {
            button: '<i class="fa fa-arrow-circle-o-up"></i>'+document.webL10n.get('choose-file'),
            altButton: document.webL10n.get('choose-youtube'),
            altInputText: document.webL10n.get('youtube-instrux'),
            closeAlt: '<i class="fa fa-times"></i>'
        }
    });    

    // this is a workaround for an iOS bug 
    if (is_iOS()) {
        document
            .querySelector('.file-input-outer input[type="file"]')
            .removeAttribute('accept');
    }
    setFormatsMessage( oTinput.getSupportedFormats() );
    loadPreviousFileDetails();
    show();
    
    return function reset() {
        loadPreviousFileDetails();
        show();
    }

}

function is_iOS() {
    return (
        window.navigator.userAgent.indexOf('iPad') > -1 ||
        window.navigator.userAgent.indexOf('iPhone') > -1
    );
}

function setFormatsMessage(formats){
    var text = document.webL10n.get('formats');
    text = text.replace("[xxx]", formats.audio.join('/') );
    text = text.replace("[yyy]", formats.video.join('/') );
    document.getElementById("formats").innerHTML = text;
}

function loadPreviousFileDetails(){
    if ( localStorageManager.getItem("oT-lastfile") ) {
        var lastFile = JSON.parse( localStorageManager.getItem("oT-lastfile") );
        var lastfileText = document.webL10n.get('last-file');
        if (lastFile.name === undefined) {
            document.getElementById("lastfile").innerHTML = lastfileText+' '+lastFile;
        } else if (lastFile.source === '') {
            document.getElementById("lastfile").innerHTML = lastfileText+' '+lastFile.name;
        } else {
            var el = document.getElementById("lastfile");
            el.innerHTML = lastfileText+' <span class="media-reload">'+lastFile.name+'</span>';
            el.addEventListener('click',function(){ 
                processYoutube( lastFile.source );
            });
        }
    }    
}

function saveFileDetails(fileDetails){
    var obj = fileDetails;
    if (typeof file === 'string') {
        obj = {
            name: fileDetails,
            source: ''
        }
    }
    localStorageManager.setItem("oT-lastfile", JSON.stringify( obj ));
}

function show(){
    $('.topbar').addClass('inputting');
    $('.input').addClass('active');
    $('.sbutton.time').removeClass('active');
    $('.text-panel').removeClass('editing');
    
}

export function getQueryParams(){

    return location.search
        .slice(1)
        .split('&')
        .reduce((acc,curr)=>{ 

            let [ key, value ] = curr.split("=");
            acc[key] = encodeURIComponent(value);
            return acc; 

        }, {});    

}

export function hide(){
    $('.topbar').removeClass('inputting');
    $('.input').removeClass('active');
    $('.sbutton.time').addClass('active');
    $('.text-panel').addClass('editing');
    $('.ext-input-field').hide();
    $('.file-input-outer').removeClass('ext-input-active');
};


// oTinput module

!function(){"use strict";function a(a){var b=this;this._text=a.text||{},this._onFileChange=a.onFileChange||function(){},this._onFileError=a.onFileError||function(){},this._onURLSubmit=a.onURLSubmit||function(){},this._onURLError=a.onURLError||function(){},this._dragover=a.onDragover||function(){},this._dragleave=a.onDragleave||function(){},this.element=this._setupElement(a.element),this._setupMouseEvents(),$(this.element).find('input[type="file"]').change(function(){b._reactToFile(this)}),$(this.element).find(".ext-input-field input").on("submit",function(){b._reactToURL($(this).val())}).keypress(function(a){return 13===a.which?(b._reactToURL($(this).val()),!1):void 0})}a.prototype.getSupportedFormats=function(){var b=["mp3","ogg","webm","wav"],c=["mp4","ogg","webm"],d=this.isFormatSupported||a.isFormatSupported,e=$.map(b,function(a,b){return d(a)?a:void 0}),f=$.map(c,function(a,b){return d(a)?a:void 0});return{audio:e,video:f}},a.prototype.isFormatSupported=function(a){var b;if("string"!=typeof a){var c=a.type.split("/")[0];return b=document.createElement(c),!(!b.canPlayType||!b.canPlayType(a.type).replace(/no/,""))}return b=document.createElement("audio"),!(!b.canPlayType||!b.canPlayType("audio/"+a+";").replace(/no/,""))},a.getSupportedFormats=a.prototype.getSupportedFormats,a.isFormatSupported=a.prototype.isFormatSupported,a.prototype.parseYoutubeURL=function(a){if(a.match){var b=/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/,c=a.match(b);if(c&&11===c[2].length)return c[2]}return!1},a.parseYoutubeURL=a.prototype.parseYoutubeURL,window.oTinput=a,a.prototype._setupElement=function(a){if("undefined"==typeof a)throw"must specify container element";var b=this._text.button||"Choose audio (or video) file",c='<button class="btn-file-input" style="width: 100%;">'+b+"</button>",d=["position: absolute","top: 0","left: 0","opacity: 0","width: 100%"].join(";"),e='<input type="file" accept="audio/*, video/*" style="'+d+'">',f="position: relative; overflow: hidden;",g='<div class="file-input-wrapper" style="'+f+'">'+c+e+"</div>",h=this._text.altButton||"Enter file URL",i='<button class="alt-input-button">'+h+"</button>",j=this._text.altInputText||"Enter URL of audio or video file, or YouTube video:",k=this._text.closeAlt||"close",l='<div class="ext-input-field" style="display: none;"><div class="close-ext-input">'+k+"</div><label>"+j+'<input type="text"></label><div class="ext-input-warning"></div></div>';return $(a).html(g+i+l),$(a)[0]},a.prototype._setupMouseEvents=function(){var a=this,b=this.element,c=$(b).find(".file-input-wrapper")[0];c.addEventListener("dragover",function(){a._dragover()},!1),c.addEventListener("dragleave",function(){a._dragleave()},!1),$(b).find(".alt-input-button").click(function(){a.showURLInput()}),$(b).find(".close-ext-input").click(function(){a.showFileInput()})},a.prototype._reactToFile=function(a){var b=a.files[0];if(this.isFormatSupported(b))this._onFileChange(b);else{var c=new Error("Filetype "+b.type+" not supported by this browser");this._onFileError(c,b)}},a.prototype._reactToURL=function(a){var b=a.replace(/\s/g,"");if(this.parseYoutubeURL(b))return this._onURLSubmit(b);var c=b.split("."),d=c[c.length-1];if(this.isFormatSupported(d))this._onURLSubmit(b);else{var e=new Error("Filetype "+d+" not supported by this browser");this._onURLError(e,a)}},a.prototype.showURLInput=function(){$(this.element).find(".ext-input-field").show().find("input").focus(),$(this.element).addClass("ext-input-active")},a.prototype.showFileInput=function(){$(this.element).find(".ext-input-field").hide(),$(this.element).removeClass("ext-input-active")}}();


/* localStorageManager v0.2.1 */
;(function(){
'use strict';

var localStorageManager = {
    identifier: 'localStorageManager',
    setItem: function(key,value){
        var that = this;
        var now = new Date().getTime();
        var valueWithMetadata = {
            value: value,
            timestamp: now
        };
        try {
            localStorage.setItem(
                this.identifier+'_'+key,
                JSON.stringify(valueWithMetadata)
            );
            this.full = false;
        } catch (err) {
            var error = err.name;
            // Possible error names:
            // NS_ERROR_DOM_QUOTA_REACHED
            // QuotaExceededError
            this.full = true;
        }
        if (this.full) {
            if (
                !this._lastRanOnFull && this.onFull &&
                !((now - this._lastRanOnFull) < 1000)
            ) {
                this.onFull();
                this._lastRanOnFull = now;
            }
            this.clearOldest( function(){
                that.setItem(key, value);
            } );
        }
    },
    getItem: function(key, prefix){
        prefix = prefix || this.identifier+'_';
        var parsed = this.getItemMetadata(key, prefix);
        if (parsed && parsed.value) {
            return parsed.value;
        } else {
            return null;
        }
    },
    getItemMetadata: function(key, prefix){
        if (prefix === undefined) {
            prefix = this.identifier+'_';
        }
        var raw = localStorage.getItem(prefix+key);
        if ((raw === null) || (raw === undefined)) {
            return null;
        }
        var parsed = JSON.parse(raw);
        parsed.key = key;
        if (parsed && parsed.value) {
            return parsed;
        }
        return null;
        
    },
    removeItem: function(key){
        localStorage.removeItem(this.identifier+'_'+key);
    },
    getAll: function(opts){
        opts = opts || {};
        var result_obj = {};
        var result_arr = [];
        for (var i = 0; i < localStorage.length; i++) {
            var item = undefined;
            var key = localStorage.key(i);
            if (opts.all === true) {
                item = this.getItemMetadata(key,'');
            } else if (key.indexOf(this.identifier) > -1) {
                item = this.getItemMetadata(key,'');
            }
            key = key.replace(this.identifier+'_','');
            if (item) {
                result_obj[key] = item.value || item;
                result_arr.push({
                    key: key,
                    value: item.value || item,
                    timestamp: item.timestamp || null,
                    index: i
                });
            }
        }
        result_arr.sort(function(a,b){
            if (a.timestamp !== b.timestamp) {
                return a.timestamp - b.timestamp;
            } else {
                return a.index - b.index;
            }
        })
        if (opts.format === 'array') {
            return result_arr;
        } else {
            return result_obj;
        }
    },
    getArray: function(opts){
        opts = opts || {};
        opts.format = 'array';
        return this.getAll(opts);
    },
    getFirst: function(){
        var arr = this.getArray();
        return arr[0];
    },
    clearOldest: function(callback){
        if (this.full !== true) {
            return;
        }
        var array = this.getArray();
        for (var i = 0; i < 3; i++) {
            if (array[i]) {
                localStorageManager.removeItem( array[i].key );
            }
        }
        var testKey = this.identifier+'__test_'+new Date().getTime();
        try {
            localStorage.setItem(testKey,'A');
            // assumes test passes...
            this.full = false;
            this.saveAttempts = 0;
            if (callback) { callback(); }
        } catch (err) {
            this.saveAttempts += 1;
            if (this.saveAttempts < 10) {
                this.clearOldest(callback);
            } else if (this.onSaveFailure) {
                this.onSaveFailure();
            }
        }
        localStorage.removeItem(testKey);
    },
    saveAttempts: 0
}

window.localStorageManager = localStorageManager;

}());