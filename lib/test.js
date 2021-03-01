var fs = require('fs');

/*
 * Todo: design a good way to test all of this stuff.
 */
module.exports = function TestingFramework(app)
{
    this.tests = {};
    this.errors = [];
    this.success = [];
    this.showSuccess = true;
    this.failHard = true;

    this.assert = function(bTest, eMessage)
    {
    	if( !bTest ) {
    		this.errors.push(eMessage);
    	} else {
    		this.success.push(eMessage);
    	}
    };

    this.runTests = function() {
      var show_tests = false;
        // yep. this is my good way to test all this stuff.

    	console.log("Running tests.");

        var dn = './lib/test/';
        var d = fs.readdirSync(dn);
        var i = d.length;
        while( i > 0 ) { --i;
            var x = d[i].split('.');
            var dlname = x[0];
            this.tests[ dlname ] = require( './test/' + d[i]);
        }

        for( i in this.tests ) {
            var a = new this.tests[i](app, this);
            if( show_tests )
              console.log("Test " + i);
            a.run();
        }

        if( this.showSuccess ) {
        	var slen = this.success.length;
        	var tlen = slen + this.errors.length;
        	console.log("Passed " + slen + "/" + tlen + " tests");
        	if( this.errors.length != 0 ) {
	        	for( i=0; i<this.success.length; ++i ) {
	        		console.log("Test passed: ", this.success[i]);
	        	}
        	}
        }
        if( this.errors.length > 0 ) {
        	for( i=0; i<this.errors.length; ++i ) {
        		console.log("Test failed: ", this.errors[i]);
        	}
        	if( this.failHard ) {
        		process.exit();
        	}
        }
    };
};
