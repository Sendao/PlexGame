var net = require('net');

function Ipc(app) {
  this.app = app;
  cc = this;

  this.modlocaL = function() {
  	cc.app.ipc = cc.app.tools.Ipc;

  	this.ipcMessage = function( msg, keycode, cb ) {
  		cc.send(msg,keycode,cb);
  	}
  };

  this.handlers = [];

  this.register = function( handler )
  {
  	this.handlers.push(handler);
  };

  this.process = function( keycode, data ) {
  	var leng, psize, tleng = data.length, runlen=0;
    var found = false;

    if( tleng <= 0 ) return false;

  	while( runlen < tleng ) {
  	  [leng,psize] = this.app.szn.readVarBin( this.app.szn.type_uint16, data, runlen );
      if( psize <= 0 ) {
        if( !found ) return false;
        break;
      } else {
        found = true;
      }
  	  runlen += psize;
      //console.log("Packet size: " + leng);
    	var scanbuf = this.app.szn.binslice( data, runlen, leng );
      //console.log("Scanbuf size: " + scanbuf.length);
    	var msg, leng2;
    	[msg,leng2] = this.app.szn.readBuffer( scanbuf, leng );
      //console.log("Process " + msg.type + ": ");
      var tpd = this.app.szn.typeById(msg.type);
      msg.data.byteOffset=0;

      if( msg.data.length == 0 ) {
        console.log("Empty packet", msg);
      } else {
        /*
        if( tpd == null )
          console.log("Message length: " + msg.data.length + ", type: string");
        else
          console.log("Message length: " + msg.data.length + ", type", tpd);
        */
        [msg.data,leng3] = this.app.szn.readVarBin( msg.type, msg.data );

        //console.log("Processed message: ", msg);
      	runlen += leng2;
      	found=false;
      	for( var i=0; i<this.handlers.length; ++i ) {
      		if(  this.handlers[i](keycode,msg,leng2) == true ) {
      			found=true;
      			break;
      		}
      	}
      }
  	}

  	return found;
  };

  this.send = function( msg, keycode, cb )
  {
		var sock = net.connect('/tmp/game.sock');
		var msg_sent = false;
		var fmsg = Buffer.from(msg);
    //console.log("send():", fmsg);
		var cc = this;

		sock.on('connect', function(){
			//console.log("IPC Connection made");
		});
		sock.on('close', function(){
			//console.log("IPC Connection closed.");
		});
		sock.on('data', function(data){
			//console.log("IPC Connection data");
      //console.log("ipc",data);
			if( cb )
				cb( keycode, data );
			if( cc.process( keycode, data ) )
        sock.end();
			//console.log(data);
		});
		sock.on('error', function(err){
			console.log("IPC Connection error");
			console.log(err);
		});
		sock.on('drain', function(){
			console.log("IPC Connection drain");
		});
		sock.on('ready', function(){
			//console.log("Socket ready");
			if( msg_sent == false ) {
				msg_sent = true;
				sock.write( fmsg, 'utf8' );
				//console.log("Message sent (" + msg + ")");
			}
		});
	};
};

module.exports = Ipc;
