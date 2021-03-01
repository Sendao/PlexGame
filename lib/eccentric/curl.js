//var nc = require('node-curl');

function CurlHandler() {
	this.get = function( url, cb ) {
		/*nc(url, function(err) {
			var result = { 'status': this.status, 'data': this.body };
			cb(err,result);
		});*/
	};
}

module.exports = CurlHandler;
