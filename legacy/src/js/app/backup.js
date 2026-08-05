const $ = require('jquery');
const localStorageManager = require('local-storage-manager');
import showMessage from './message-panel';
import {setEditorContents} from './texteditor';
import { addKeyboardShortcut } from './ui';

function getTexteditorContents() {
    return document.querySelector('#textbox').innerHTML;
}

function init(){
    localStorageManager.onFull = function(){
        var backupClearMessage = document.webL10n.get('backup-clear');
        showMessage( backupClearMessage );
    }
    localStorageManager.onSaveFailure = warnAboutBackupFailure;
    migrateToLocalStorageManager();
    autosaveInit();
    setInterval(function(){
        saveBackup();
    },300000 /* 5 minutes */);
    
    
    $('.sbutton.backup').click(function(){
        openPanel();
    });
        
    $('.backup-close').click(function(){
        closePanel();
    });
    addKeyboardShortcut('mod+s', () => saveBackup());
    
}

// original autosave function
function autosaveInit(){
    var field = document.querySelector("#textbox");
    
    // load existing autosave (if present)
    try {
        const autosaveContents = localStorageManager.getItem("autosave");
        if (autosaveContents) {        
           setEditorContents( localStorageManager.getItem("autosave") );
        }
    } catch (e) {
        // don't load autosave, as it's corrupted
    }
    // autosave every second - but wait five seconds before kicking in
    setTimeout(function(){
        // prevent l10n from replacing user text
        const markupWithL10nData = Array.from(
            field.querySelectorAll('p[data-l10n-id]')
        );
        markupWithL10nData.forEach(el => {
            el.removeAttribute('data-l10n-id');
        });
        setInterval(function(){
           localStorageManager.setItem("autosave", getTexteditorContents());
        }, 1000);
    }, 5000);
}


function migrateToLocalStorageManager(){
    // May 2015 - migration to localStorageManager
    if ( localStorage.getItem("autosave")) {        
       localStorageManager.setItem("autosave", localStorage.getItem("autosave") );
    }
    var backupList = [];
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.indexOf('oTranscribe-backup') === 0) {
            var item = {
                value: localStorage.getItem( key ),
                timestamp: key.split('-')[2]
            };
            localStorage.setItem( 'localStorageManager_'+key, JSON.stringify(item) );
            localStorage.removeItem( key );
        }
    }
}

let notYetWarned = true;
function warnAboutBackupFailure(){
    var backupWarningMessage = document.webL10n.get('backup-error');
    if (notYetWarned === true) {
        showMessage( backupWarningMessage );
        notYetWarned = false;
    }
}

function closePanel(){
    $('.backup-panel').fadeOut('fast',function(){
        $('.backup-window').empty();
        
    });
}

function openPanel(){
    populatePanel();
    $('.backup-window').height( $('.textbox-container').height() * (3/5) );
    $('.backup-panel').fadeIn('fast');
}

function formatDate(timestamp){
    var d = new Date( parseFloat(timestamp) );
    var day =  d.getDate() + '/' + (d.getMonth()+1);
    var now = new Date();
    const today = now.getDate() + '/' + (now.getMonth()+1);
    const yesterday = (now.getDate()-1) + '/' + (now.getMonth()+1);
    if (day === today) {
        day = document.webL10n.get('today');
    } else if (day === yesterday) {
        day = document.webL10n.get('yesterday');
    }
    var time = d.getHours() + ':';
    if (d.getMinutes() < 10) {
        time += '0';        
    }
    time += d.getMinutes();
    
    const formattedDate = day + ' ' + time;
    return formattedDate;
}

function trimBackupsToOneHundred(){
    var backups = listFiles();
    if (backups.length < 100) {
        return;
    }
    for (var i = 0; i < backups.length; i++) {
        if (i > 99) {
            localStorageManager.removeItem(backups[i]);
        }
    }
}


function generateBlock(ref){
    // create icon and 'restore' button
    var obj = localStorageManager.getItemMetadata(ref);
    var text = obj.value;
    var timestamp = obj.timestamp;
    var date = formatDate(timestamp);
    
    var block = document.createElement('div');
    var doc = document.createElement('div');
    var restoreButton = document.createElement('div');

    block.className = 'backup-block';
    doc.className = 'backup-doc';
    restoreButton.className = 'backup-restore-button';

    doc.innerHTML = text;
    var restoreText = document.webL10n.get('restore-button');
    restoreButton.innerHTML = `${date} - <span data-restore=${timestamp}>${restoreText}</span>`;
    $(restoreButton).find('span[data-restore]').click(function() {
        restoreBackup( this.dataset.restore );
    });
    
    block.appendChild(doc);
    block.appendChild(restoreButton);
    
    return block;
}


function populatePanel(){
    addDocsToPanel(0,8);
    if (listFiles().length === 0) {
        var noBackupsText = document.webL10n.get('no-backups');
        $('.backup-window').append( '<div class="no-backups">'+noBackupsText+'</div>' );
    }
}

function addDocsToPanel(start,end){
    $('.more-backups').remove();
    var allDocs = listFiles();
    const docs = allDocs.slice(start,end);
    for (var i = 0; i < docs.length; i++) {
        try {
            $('.backup-window').append( generateBlock(docs[i]) );
        } catch (e) {
            // problem with that backup; ignore
        }
    }
    if (allDocs[end]) {
        var loadMoreText = document.webL10n.get('more-backups');
        const moreBackupsEl = $(`
            <div class="more-backups"
                data-start=${end} 
                data-end=${end+8} 
            >
                ${loadMoreText}
            </div>
        `);
        moreBackupsEl.click(function() {
            const {start, end} = this.dataset;
            addDocsToPanel(start, end);
        });
        
        $('.backup-window').append( moreBackupsEl );
    }
}

function listFiles(){
    var result = [];
    var ls = [];
    try {
        ls = localStorageManager.getArray();
    } catch (e) {
        console.error(e);
        console.error('Problem listing files from localStorage.');
        showMessage('Error listing files from localStorage. Manually clearing localStorage data may fix this. <a href="./help#why_is_otranscribe_is_no_longer_saving_backups">Instructions here</a>.');
        throw(e);
    }
    for (var i = 0; i < ls.length; i++) {
        if (ls[i].key.indexOf('oTranscribe-backup') > -1) {
            result.push( ls[i].key );
        }
    }
    return result.sort().reverse();
}



function saveBackup(){
    // save current text to timestamped localStorageManager item
    var text = getTexteditorContents();
    var timestamp = new Date().getTime();
    localStorageManager.setItem('oTranscribe-backup-'+timestamp, text);
    // and bleep icon
    $('.sbutton.backup').addClass('flash');
    setTimeout(function(){
        $('.sbutton.backup').removeClass('flash');
    },1000);
    // and add to tray
    var newBlock = generateBlock('oTranscribe-backup-'+timestamp);
    newBlock.className += ' new-block';
    $('.backup-window').prepend( newBlock );
    $( newBlock ).animate({
        'opacity': 1,
        'width': '25%'
    },'slow',function(){
        $( newBlock ).find('.backup-restore-button').fadeIn();
    });
    trimBackupsToOneHundred();
}



function restoreBackup(timestamp){
    saveBackup();
    const restoreErrorMessage = document.webL10n.get('restore-error');
    try {
        var item = localStorageManager.getItem('oTranscribe-backup-'+timestamp);
        if ( item ) {
            var newText = item;
            setEditorContents(newText, {transition: true});
        } else {
            showMessage( restoreErrorMessage );
        }
    } catch (e) {
        showMessage( restoreErrorMessage );
    }
    closePanel();
}

export { init as initBackup };