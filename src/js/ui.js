/******************************************
             User Interaction
******************************************/

    // keyboard shortcuts
    function pd(e){
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            // internet explorer
            e.returnValue = false;
        }
    }

    Mousetrap.bind('escape', function(e) {
        pd(e);
        oT.player.playPause();
        return false;
    });
    Mousetrap.bind('f1', function(e) {
        pd(e);
        oT.player.skip('backwards');
        return false;
    });
    Mousetrap.bind('f2', function(e) {
        pd(e);
        oT.player.skip('forwards');
        return false;
    });
    Mousetrap.bind('f3', function(e) {
        pd(e);
        oT.player.speed('down');
        return false;
    });
    Mousetrap.bind('f4', function(e) {
        pd(e);
        oT.player.speed('up');
        return false;
    });
    Mousetrap.bind('mod+j', function(e) {
        pd(e);
        oT.timestamp.insert();
        return false;
    });
    Mousetrap.bind('mod+s', function(e) {
        pd(e);
        oT.backup.save();
        return false;
    });

    Mousetrap.bind('mod+b', function(e) {
        pd(e);
        document.execCommand('bold',false,null);
        return false;
    });

    Mousetrap.bind('mod+i', function(e) {
        pd(e);
        document.execCommand('italic',false,null);
        return false;
    });


    $('.play-pause').click(function(){
        oT.player.playPause();    
    });

    $('.skip-backwards').click(function(){
        oT.player.skip('backwards');    
    });
    $('.skip-forwards').click(function(){
        oT.player.skip('forwards');    
    });
    $('.button.reset').click(function(){
        oT.media.reset({input: true});    
    });

    $( ".speed" ).click(function() {
        if ($('.speed-box').not(':hover').length) {
            $(this).toggleClass('fixed');
        }    
    });

    $( "#slider3" ).change(function() {
      oT.player.speed(this.valueAsNumber);
    });    
    
    $('.title').click(function(){
        toggleAbout();
    });
    
    $('.language-title').click(function(){
        oT.lang.togglePanel();
    });
    
    $('.language-button').click(function(){
       oT.lang.setLang( $(this).data('language') ); 
    });

    $('.about .start').click(function(){
        if ( $(this).hasClass('ready') ) {
            toggleAbout();
        }
    });
    
    $('#attach').change(function() {
        oT.input.reactToFile(this);
    });    

    $('#local-file-import').change(function() {
        oT.import.localButtonReaction(this);
    });        
    
    $('.yt-input').click(function(){
        oT.input.askForYoutube();
    })
    
    $('.close-ext-input').click(function(){
        oT.input.returnToNormal();
    });

    $('.sbutton.export').click(function() {
        placeExportPanel();
    });    
    
    $('.sbutton.backup').click(function(){
        oT.backup.openPanel();
    });
        
    $('.backup-close').click(function(){
        oT.backup.closePanel();
    });
    
    $('.textbox-container').click(function(e) {
        if(
            $(e.target).is('#icon-exp') ||
            $(e.target).is('.export-panel') ||
            $(e.target).is('.sbutton.export')
        ){
            e.preventDefault();
            return;
        }
        hideExportPanel();
    });    
    
    $(".export-panel").click(function(e) {
         e.stopPropagation();
    });
    
    $('.close-message-panel').click(function(){
        oT.message.close();
    })
    

// End UI



})(); // end script


