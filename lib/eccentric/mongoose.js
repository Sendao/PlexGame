var mongoose = require('mongoose');
var Grid = require('gridfs');

function MongooseObject(app) {
	this.app = app;
  this.clients = {};

  this.modlocaL = function() {
  	cc.app.mongoose = mongoose;
		cc.app.Mongoose = this;
		mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
		mongoose.connection.once('open', function() {
			console.log("Mongoose db connected");
			cc.app.gfs = Grid(mongoose.connection.db, mongoose.mongo);
		}.bind(this));
		mongoose.createConnection('mongodb://localhost/node', {useNewUrlParser: true});
  };


	this.registerTable = function( client, tablename )
	{
		var obj = {};
		obj[ tablename + "_save" ] = {};
		obj[ tablename + "_remove" ] = {};
		this.registerClient(client, obj);
	};

  this.registerClient = function( client, registry )
  {
    var i;

    for( i in registry ) {
      if( !(i in this.clients) ) {
        this.clients[ i ] = [];
      }
      this.clients[i].push( [ client, registry[i] ] );
    }
  };

	this.closeClient = function( pagekey )
	{
		var i,j;
		for( i in this.clients ) {
			for( j=0; j<this.clients[i].length; j++ ) {
				if( this.clients[i][j][0].pagekey == pagekey ) {
					this.clients[i].splice(j,1);
					j--;
				}
			}
		}
	};

  this.testCondition = function(testOf, opcode, value) {
    switch (opcode) {
      case 'in':
        return (value.indexOf(testOf) != -1);
      case '!in':
      case 'not in':
        return (value.indexOf(testOf) == -1);
      case 'has':
        return (testOf.indexOf(value) != -1);
      case '!has':
      case 'not has':
        return (testOf.indexOf(value) == -1);
      case '=':
        return (testOf == value);
      case '==':
        return (testOf === value);
      case '.=':
        return (parseInt(testOf) == parseInt(value));
      case '!=':
        return (testOf != value);
      case '<':
        return (parseInt(testOf) < parseInt(value));
      case '<=':
        var istrue = (parseInt(testOf) <= parseInt(value));
        this.app.logIf("database", testOf + "<=" + value + "?" + istrue);
        return istrue;
      case '>':
        return (parseInt(testOf) > parseInt(value));
      case '>=':
        return (parseInt(testOf) >= parseInt(value));
    }

    return false;
  };

  this.sendMessage = function( handle, obj )
  {
    var i, cli, passed;
    var j, cond, user;

    if( !(handle in this.clients) ) return;

    for( i=0; i<this.clients[handle].length; ++i ) {
      cli = this.clients[handle][i];
      passed = true;
      if( 'cond' in cli[1] ) {
        for( j=0; j<cli[1].cond.length; ++j ) {
          if( !this.testCondition( obj[ cli[i].cond[j][0] ], cli[i].cond[j][1], cli[i].cond[j][2] ) ) {
            passed=false;
            break;
          }
        }
      }
      if( passed ) {
	      if (typeof cli[0].pagekey == 'undefined') {
	        console.log("Cannot send: no pagekey: ", cli[0]);
	        continue;
	      }
				if( cli[0].remoteAddress == false || typeof cli[0].send == 'undefined' )
					user = this.app.locateUser(cli[0].pagekey);
				else
					user = cli[0];

				//console.log("Send object ", obj, " to " + cli[0].pagekey + ", typeof " + cli[0].send);
        user.send( { 'code': handle, 'data': obj } );
      }
    }
  };

	// web interfaces
	this.autoRoute = function( router, otables, prefix, suffix )
	{
    var nm;
    if (typeof prefix == 'undefined') prefix = '';
    if (typeof suffix == 'undefined') suffix = '';

		if( typeof otables.autoface == 'undefined' ) return;
		for( nm in otables.autoface ) {
	    if ( !otables.autoface[nm].nopost ) {
	      router.post(prefix + nm + suffix).bind(this.doPost.bind(this,otables.autoface[nm]));
	      router.post(prefix + "del/" + nm + suffix).bind(this.doRemove.bind(this,otables.autoface[nm]));
	    }
	    if ( !otables.autoface[nm].noget ) {
	      router.get(prefix + nm + suffix).bind(this.doGet.bind(this,otables.autoface[nm]));
	    }
		}
	};

	this.doGet = function( otab, req, res, params ) {

	};

	this.doRemove = function( otab, req, res, params ) {

	};

	this.doPost = function( otab, req, res, params ) {

	};


	// db interfaces

  this.schemaModel = function( modelname, schema, useSockets )
  {
		/*
    if( useSockets ) {
      schema.post('save', function(doc) {
        //console.log("schema_post_save: " + modelname);
        //this.sendMessage(modelname + "_save", doc.toObject());
      }.bind(this));
      schema.post('remove', function(doc) {
        //console.log("schema_post_remove: " + modelname);
        //this.sendMessage(modelname + "_remove", doc.toObject());
      }.bind(this));
    }
		*/
    return this.app.mongoose.model(modelname, schema);
  };

  this.save = function( doc, handler )
  {
    doc.save( function( err, doc2 ) {
      if( err ) {
        console.log("Mongoose error: ", err);
      } else {
				//console.log("Mongoose save succeeded");
				if( typeof handler != 'undefined' ) {
					handler(doc2);
				}
			}
    });
  };

};


module.exports = MongooseObject;
