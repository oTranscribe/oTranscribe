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
    var text = localStorage.getItem(ref);
    var timestamp = ref.replace('oTranscribe-backup-','');
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
    // save current text to timestamped localStorage item
    var text = document.getElementById("textbox");
    var timestamp = new Date().getTime();
    oT.backup.saveToLocalStorage('oTranscribe-backup-'+timestamp, text.innerHTML);
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
    
}

oT.backup.saveToLocalStorage = function(key,value){
    try {
       localStorage.setItem( key, value );
    } catch (e) {
       if (e.name === "NS_ERROR_DOM_QUOTA_REACHED") {
           oT.backup.removeOldest();
           oT.backup.save();
       }
    }
    
}

oT.backup.init = function(){
    setInterval(function(){
        oT.backup.save();
        oT.backup.cleanup();
    },300000 /* 5 minutes */);
}

oT.backup.list = function(){
    var result = [];
    for (var i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i).indexOf('oTranscribe-backup') > -1) {
            result.push(localStorage.key(i));
        }
    }
    return result.sort().reverse();
}


oT.backup.restore = function(timestamp){
    oT.backup.save();
    var newText = localStorage.getItem('oTranscribe-backup-'+timestamp);
    oT.import.replaceTranscriptTextWith(newText);
    oT.backup.closePanel();
}

oT.backup.cleanup = function(){
    var backups = oT.backup.list();
    for (var i = 0; i < backups.length; i++) {
        var bu = backups[i];
        var ts = bu.replace('oTranscribe-backup-','');
        var date = new Date( parseFloat( ts ) );
        var diff = Date.now() - date;
        // 1 day = 86400000 miliseconds
        if (diff > (86400000*7) ) {
            localStorage.removeItem( bu );
        }
    }
}

oT.backup.removeOldest = function(){

    var list = oT.backup.list();
    var toDelete = list.slice(Math.max(list.length - 5, 1));
    for (var i = 0; i < toDelete.length; i++) {
        localStorage.removeItem( toDelete[i] );
    	localStorage.clear( toDelete[i] );
    }
}

// original autosave function
function saveText(){
    var field = document.getElementById("textbox");
    // load existing autosave (if present)
    if ( localStorage.getItem("autosave")) {        
       field.innerHTML = localStorage.getItem("autosave");
    }
    // autosave every second - but wait five seconds before kicking in
    setTimeout(function(){
        // prevent l10n from replacing user text
        $('#textbox p[data-l10n-id]').attr('data-l10n-id','');
        setInterval(function(){
           oT.backup.saveToLocalStorage("autosave", field.innerHTML);
        }, 1000);
    }, 5000);
}
