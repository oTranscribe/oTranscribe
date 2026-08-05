casper.test.begin('limit to 100 items', 5, function(test) {
    casper.start('http://localhost:8000/dist/');

    casper.thenEvaluate(function() {
        localStorage.clear();
    });
    
    for (var i = 0; i < 121; i++) {
        casper.wait(10).thenEvaluate(function(index) {
            document.querySelector('#textbox').innerHTML = index;
            oT.backup.save();
        },i);
        
    }

    casper.wait(100);

    casper.then(function(){
        var stored = casper.evaluate(function() {
            return oT.backup.list();
        });
        var storedValues = casper.evaluate(function() {
            var list = oT.backup.list();
            var output = [];
            for (var i = 0; i < list.length; i++) {
                output.push( localStorageManager.getItem(list[i]) );
            }
            return output;
        });
        var newest = storedValues[0];
        var oldest = storedValues[storedValues.length-1];
        
        this.log(newest +' '+ oldest);
        this.log(JSON.stringify(storedValues));

        // some have been deleted
        test.assertEqual(stored.length, 100);
        test.assertEqual(storedValues.length, 100);
        
        // has most recent one
        test.assertEqual(newest, '120');
        test.assertEqual(oldest, '21');
        test.assertEqual(parseInt(newest)-parseInt(oldest), 99);
    });
    
    casper.thenEvaluate(function() {
        localStorage.clear();
    });
    
    casper.run(function(){
        test.done();
    });
});
