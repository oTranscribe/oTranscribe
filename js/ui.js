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
        oT.media.playPause();
        return false;
    });
    Mousetrap.bind('f1', function(e) {
        pd(e);
        oT.media.skip('backwards');
        return false;
    });
    Mousetrap.bind('f2', function(e) {
        pd(e);
        oT.media.skip('forwards');
        return false;
    });
    Mousetrap.bind('f3', function(e) {
        pd(e);
        oT.media.speed('down');
        return false;
    });
    Mousetrap.bind('f4', function(e) {
        pd(e);
        oT.media.speed('up');
        return false;
    });
    Mousetrap.bind('mod+j', function(e) {
        pd(e);
        ts.insert();
        return false;
    });
    Mousetrap.bind('mod+s', function(e) {
        pd(e);
        alert("No need to manually save - your transcript is automatically backed up continuously.")
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
        oT.media.playPause();    
    });

    $('.skip-backwards').click(function(){
        oT.media.skip('backwards');    
    });
    $('.skip-forwards').click(function(){
        oT.media.skip('forwards');    
    });

    $( ".speed" ).click(function() {
        if ($('.speed-box').not(':hover').length) {
            $(this).toggleClass('fixed');
            console.log ($('.speed-box').not(':hover').length);
        }    
    });

    $( "#slider3" ).change(function() {
      oT.media.speed(this.valueAsNumber);
    });    
    
    $('.title').click(function(){
        toggleAbout();
        console.log('about');
    });

    $('.help-title').click(function(){
        toggleHelp();
    });

    $('#close-help').click(function(){
        toggleHelp();
    });


    $('.about .start.ready').click(function(){
        toggleAbout();
    });
    
    $('#attach').change(function() {
        reactToFile(this);
    });    

    $('#icon-exp').click(function() {
        placeExportPanel();
    });    
    
    // $('.export-block-gd').click(function() {
    //     if ( 
    //         $( this ).hasClass( "gd-authenticated" ) 
    //         && 
    //         ( $( this ).attr('href').indexOf('google') == -1 )
    //     ){
    //         insertFile();            
    //         return false;
    //     } else {
    //         return true;
    //     }
    // });
    


    
    $('.textbox-container').click(function(e) {
        if( ($(e.target).is('#icon-exp')) || $(e.target).is('.export-panel') ){
            e.preventDefault();
            return;
        }
        hideExportPanel();
    });    
    
    $(".export-panel").click(function(e) {
         e.stopPropagation();
    });
    
    

// End UI



})(); // end script


