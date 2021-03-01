var http = require('http');

function HttpRequest() {
	this.get = function(host, path, cb) {
		var opts = { host: host, path: path };
		http.get( opts, function(response) {
	        var data = '';
	        response.on('data', function(d) {
	            data += d;
	        });
	        response.on('end', function() {
	        	cb(data);
	        });
	    });
	};
};

module.exports = HttpRequest;
