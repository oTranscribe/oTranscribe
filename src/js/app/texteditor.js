import { cleanHTML } from './clean-html';
import { activateTimestamps } from './timestamps';
const $ = require('jquery');

function countWords(str){
    var trimmedStr = $.trim(str);
    if (trimmedStr){
        return trimmedStr.match(/\S+/gi).length;
    }
    return 0;
}

function countChars(str){
    var chars = 0;
    if (document.getSelection().baseNode) {
      var parentElement = document.getSelection().baseNode.parentElement;

      // If we have bold or italics text the parentElement will be one level up
      if (parentElement.localName !== "p") {
          parentElement = parentElement.parentElement;
          // if the focus is on a popup this will reset to 0
          if (parentElement.localName !== "p") {
              return 0;
          }
      }

      var childNodes = parentElement.childNodes;
      for (var child in childNodes) {
        if (childNodes[child].textContent) {
          chars = chars + childNodes[child].textContent.length;
        }
      }
    }

    return chars;
}

function countTextbox(){
    var textboxElement = document.getElementById('textbox');

    var textboxText = textboxElement.innerText || textboxElement.textContent;
    var wordcount = countWords(textboxText);
    var charcount = countChars(textboxText);

    var wordcountText = document.webL10n.get('wordcount', {n: wordcount});
    wordcountText = wordcountText.replace(/(\d+)/, (n) => {
        return `<span class="word-count-number">${n}</span>`;
    });

    var charcountText = document.webL10n.get('charcount', {n: charcount});
    charcountText = charcountText.replace(/(\d+)/, (n) => {
        return `<span class="char-count-number">${n}</span>`;
    });

    document.querySelector('.wc-text').innerHTML = wordcountText;
    document.querySelector('.cc-text').innerHTML = charcountText;
}

function initCounts(){
    countTextbox();
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

function setEditorContents( dirtyText, opts = {} ) {

    const newText = cleanHTML(dirtyText);

    var $textbox = $("#textbox");

    function replaceText() {
        if (typeof newText === 'string') {
            $textbox[0].innerHTML = newText;
        } else {
            textbox[0].innerHTML = '';
            $textbox[0].appendChild(newText);
        }
        activateTimestamps();
        $('.textbox-container').scrollTop(0);
    }

    if (opts.transition) {
        $textbox.fadeOut(300,function(){
            replaceText();
            $(this).fadeIn(300);
        });
    } else {
        replaceText();
    }

}

function initAutoscroll() {
  var isScrolledToBottom = false;

  var container = document.querySelector('.textbox-container');
  var textbox = document.querySelector('#textbox');

  // update isScrolledToBottom on scroll event (true within 50px of the bottom of container)
  container.addEventListener('scroll', function() {
    isScrolledToBottom = container.scrollHeight - container.clientHeight - container.scrollTop <= 50;
  });

  // scroll to bottom on the input event, if isScrolledToBottom is true
  textbox.addEventListener('input', function() {
    if(isScrolledToBottom) {
      container.scrollTop = container.scrollHeight;
    }
  });
}

export {
    initWatchFormatting as watchFormatting,
    initCounts as watchCounts,
    setEditorContents as setEditorContents,
    initAutoscroll as initAutoscroll
};
