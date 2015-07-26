oT.backup = {};

oT.backup.openPanel = function(){
    oT.backup.populatePanel();
    $('.backup-window').height( $('.textbox-container').height() * (3/5) );
    $('.backup-panel').fadeIn('fast');
}

oT.backup.closePanel = function(){
    $('.backup-panel').fadeOut('fast',function(){
        $('.backup-window').empty();
        
    });
}

oT.backup.generateBlock = function(ref){
    // create icon and 'restore' button
    var obj = localStorageManager.getItemMetadata(ref);
    var text = obj.value;
    var timestamp = obj.timestamp;
    var date = oT.backup.formatDate(timestamp);
    
    var block = document.createElement('div');
    var doc = document.createElement('div');
    var restoreButton = document.createElement('div');

    block.className = 'backup-block';
    doc.className = 'backup-doc';
    restoreButton.className = 'backup-restore-button';

    doc.innerHTML = text;
    var restoreText = document.webL10n.get('restore-button');
    restoreButton.innerHTML = date+' - <span onClick="oT.backup.restore('+timestamp+');">' +restoreText+ '</span>';
    block.appendChild(doc);
    block.appendChild(restoreButton);
    
    return block;
}

oT.backup.formatDate = function(timestamp){
    var d = new Date( parseFloat(timestamp) );
    var day =  d.getDate() + '/' + (d.getMonth()+1);
    var now = new Date();
    today = now.getDate() + '/' + (now.getMonth()+1);
    yesterday = (now.getDate()-1) + '/' + (now.getMonth()+1);
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
    
    formattedDate = day + ' ' + time;
    return formattedDate;
}

oT.backup.populatePanel = function(){
    oT.backup.addDocsToPanel(0,8);
    if (oT.backup.list().length === 0) {
        var noBackupsText = document.webL10n.get('no-backups');
        $('.backup-window').append( '<div class="no-backups">'+noBackupsText+'</div>' );
    }
}

oT.backup.addDocsToPanel = function(start,end){
    $('.more-backups').remove();
    var allDocs = oT.backup.list();
    docs = allDocs.slice(start,end);
    for (var i = 0; i < docs.length; i++) {
        $('.backup-window').append( oT.backup.generateBlock(docs[i]) );
    }
    if (allDocs[end]) {
        var loadMoreText = document.webL10n.get('more-backups');
        $('.backup-window').append( '<div class="more-backups" onclick="oT.backup.addDocsToPanel('+(end)+','+(end+8)+')" >'+loadMoreText+'</div>' );
    }
}

oT.backup.save = function(){
    // save current text to timestamped localStorageManager item
    var text = document.getElementById("textbox");
    var timestamp = new Date().getTime();
    localStorageManager.setItem('oTranscribe-backup-'+timestamp, text.innerHTML);
    // and bleep icon
    $('.sbutton.backup').addClass('flash');
    setTimeout(function(){
        $('.sbutton.backup').removeClass('flash');
    },1000);
    // and add to tray
    var newBlock = oT.backup.generateBlock('oTranscribe-backup-'+timestamp);
    newBlock.className += ' new-block';
    $('.backup-window').prepend( newBlock );
    $( newBlock ).animate({
        'opacity': 1,
        'width': '25%'
    },'slow',function(){
        $( newBlock ).find('.backup-restore-button').fadeIn();
    });
    oT.backup.trimToOneHundred();
}

oT.backup.trimToOneHundred = function(){
    var backups = oT.backup.list();
    if (backups.length < 100) {
        return;
    }
    for (var i = 0; i < backups.length; i++) {
        if (i > 99) {
            localStorageManager.removeItem(backups[i]);
        }
    }
}

oT.backup.init = function(){
    localStorageManager.onFull = function(){
        var backupClearMessage = document.webL10n.get('backup-clear');
        oT.message.header( backupClearMessage );
    }
    localStorageManager.onSaveFailure = oT.backup.warning;
    oT.backup.migrate();
    oT.backup.autosaveInit();
    setInterval(function(){
        oT.backup.save();
    },300000 /* 5 minutes */);
}

oT.backup.notYetWarned = true;
oT.backup.warning = function(){
    var backupWarningMessage = document.webL10n.get('backup-error');
    if (oT.backup.notYetWarned === true) {
        oT.message.header( backupWarningMessage );
        oT.backup.notYetWarned = false;
    }
}

oT.backup.list = function(){
    var result = [];
    var ls = localStorageManager.getArray();
    for (var i = 0; i < ls.length; i++) {
        if (ls[i].key.indexOf('oTranscribe-backup') > -1) {
            result.push( ls[i].key );
        }
    }
    return result.sort().reverse();
}

oT.backup.restore = function(timestamp){
    oT.backup.save();
    var item = localStorageManager.getItem('oTranscribe-backup-'+timestamp);
    if ( item ) {
        var newText = item;
        oT.import.replaceTranscriptTextWith(newText);
    } else {
        var restoreErrorMessage = document.webL10n.get('restore-error');
        oT.message.header( restoreErrorMessage );
    }
    oT.backup.closePanel();
}

oT.backup.migrate = function(){
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

// original autosave function
oT.backup.autosaveInit = function(){
    var field = document.getElementById("textbox");
    
    // load existing autosave (if present)
    if ( localStorageManager.getItem("autosave")) {        
       field.innerHTML = localStorageManager.getItem("autosave");
    }
    // autosave every second - but wait five seconds before kicking in
    setTimeout(function(){
        // prevent l10n from replacing user text
        $('#textbox p[data-l10n-id]').attr('data-l10n-id','');
        setInterval(function(){
           localStorageManager.setItem("autosave", field.innerHTML);
        }, 1000);
    }, 5000);
}
