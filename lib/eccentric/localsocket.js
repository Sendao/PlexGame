//var wait = require('wait.for');
//var binary = require('binary');
//var readable = require('stream').Readable;

//var Sock = require('./websock.js');

function UtilsObject(app) {
    this.app = app;
    this.params = {};
     
    
    this.myStartup = function() {
    	this.loadTypes();
    };
    
    this.open = function() {

    };
    
    this.close = function(h) {
    	
    };
    
    // send: send a message
    this.send = function(h, msg) {
    	
    };
    
    // callback: set a handler when msgtype is received
    this.callback = function( h, msgtype, handler ) {
    	
    };
    
    // single: read to eof
    this.single = function( h ) {
    	// 
    };
    
    // multi: read to stream end
    this.multi = function( h ) {
    	
    };
};

module.exports = UtilsObject;
