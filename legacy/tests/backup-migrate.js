casper.test.begin('autosave migration', 7, function(test) {
    casper.start('http://localhost:8000/dist/');
        
    casper.thenEvaluate(function() {
        localStorage.clear();
        localStorage.setItem('autosave','<p>Document at latest stage...</p>');
        localStorage.setItem('oTranscribe-backup-0000000','<p>Document at earlier stage.</p>');
        localStorage.setItem('oTranscribe-backup-0222200','<p>Document at latest stage...</p>');
    });

    casper.then(function(){
        // check it's there
        test.assertEquals(this.evaluate(function() {
            return localStorage.getItem('autosave');
        }), '<p>Document at latest stage...</p>');
        test.assertEquals(casper.evaluate(function() {
            return localStorageManager.getItem('autosave');
        }), '');
        this.reload();
    });
    
    casper.waitForSelector('.start.ready').then(function(){
        
        // this.echo(this.evaluate(function() {
        //     return JSON.stringify(localStorageManager.getArray());
        // }));
        
        // check migration has gone ok
        test.assertEquals(this.evaluate(function() {
            return localStorage.getItem('autosave');
        }), '<p>Document at latest stage...</p>');
        test.assertEquals(casper.evaluate(function() {
            return localStorageManager.getItem('autosave');
        }), '<p>Document at latest stage...</p>');

        test.assertEquals(casper.evaluate(function() {
            return localStorageManager.getItemMetadata('oTranscribe-backup-0000000').timestamp;
        }), '0000000');
        test.assertEquals(casper.evaluate(function() {
            return localStorageManager.getItem('oTranscribe-backup-0000000');
        }), '<p>Document at earlier stage.</p>');
        test.assertEquals(casper.evaluate(function() {
            return localStorage.getItem('oTranscribe-backup-0000000');
        }), '');

    });
    
    casper.thenEvaluate(function() {
        localStorage.clear();
    });

    casper.run(function(){
        test.done();
    });
});
