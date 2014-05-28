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
    restoreButton.innerHTML = date+' - <span onClick="oT.backup.restore('+timestamp+');">restore</span>';
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
        day = 'Today';
    } else if (day === yesterday) {
        day = 'Yesterday'
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
        $('.backup-window').append( '<div class="no-backups">No backups found.</div>' );
    }
}

oT.backup.addDocsToPanel = function(start,end){
    $('.more-backups').remove();
    var docs = oT.backup.list();
    docs = docs.slice(start,end);
    for (var i = 0; i < docs.length; i++) {
        $('.backup-window').append( oT.backup.generateBlock(docs[i]) );
    }
    $('.backup-window').append( '<div class="more-backups" onclick="oT.backup.addDocsToPanel('+(end+1)+','+(end+9)+')" >Load older backups</div>' );
}

oT.backup.save = function(){
    // save current text to timestamped localStorage item
    var text = document.getElementById("textbox");
    var timestamp = new Date().getTime();
    localStorage.setItem('oTranscribe-backup-'+timestamp, text.innerHTML);
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
    var textbox = document.getElementById("textbox");
    var newText = localStorage.getItem('oTranscribe-backup-'+timestamp);
    document.getElementById("textbox").innerHTML = newText;
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

// original autosave function
function saveText(){
    var field = document.getElementById("textbox");
    // load existing autosave (if present)
    if ( localStorage.getItem("autosave")) {
       field.innerHTML = localStorage.getItem("autosave");
    }
    // autosave every second - but wait five seconds before kicking in
    setTimeout(function(){
        setInterval(function(){
           localStorage.setItem("autosave", field.innerHTML);
        }, 1000);
    }, 5000);
}
