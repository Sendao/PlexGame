var ObjectID = require('mongodb').ObjectID;

function MongoSessionSinglet( myapp ) {
	var app = myapp;
  var mongoose = app.mongoose;
	this.app = app;

	this.Objs = function() {

    this.computers = new mongoose.Schema({
				id: String,
				pagekey: String,
				browser: String,
				os: String,
				ips: [String],
		});
		this.Computers = app.tools.Mongoose.schemaModel( 'Computers', this.computers, false );


    this.users = new mongoose.Schema({
				name: String,
				email: String,
				password: String,
				dtlast: { type: Date, default: Date.now },
				identitycode: String,
				permissions: { type: [String], default: [ 'guest', 'user' ] },
				fbauth: String,
				userid: { type: String, default: '' }
		});
		this.Users = app.tools.Mongoose.schemaModel( 'Users', this.users, false );

		this.sessions = new mongoose.Schema({
				pckey: String,
				pagekey: String,
				login: { type: Number, default: 0 },
				userid: { type: String, default: '' },
				dtstamp: Date,
				permissions: [ String ]
		});
		this.Sessions = app.tools.Mongoose.schemaModel( 'Sessions', this.sessions, false );
	};

	this.routes = function( router ) {
		router.post( '/administrate.json' ).bind( this.getAdmin.bind( this ) );
		router.post( '/msignup' ).bind( this.signup.bind( this ) );
		router.post( '/mverify' ).bind( this.verify.bind( this ) );
		router.post( '/msignin' ).bind( this.signin.bind( this ) );
		router.post( '/mlogout' ).bind( this.logout.bind( this ) );
		router.post( '/sconfirm.js' ).bind( this.socketConfirm.bind( this ) );
	};

	this.socketConfirm = function( req, res, params ) {
		this.app.confirmSocketMsg( params['c'] );
		this.app.respond.jsonOk( res );
	};

	this.authSession = function( req, params, cb ) {
		var sess, pckey=false, pagekey=false;

		if( req && req.cookies ) {
			pckey = req.cookies.pckey;
			pagekey = req.cookies.pagekey;
		}

		console.log("authSession(" + pckey + ", " + pagekey + ")");

		var sessA = false;
		if( pagekey != false ) {
			this.objs.Sessions.find( { pagekey: pagekey }, function( e, sessA ) {
				if( e ) {
					console.log("authSession error 1: ", e);
					return;
				}
				if( sessA.length != 1 ) {
					console.log( "Incorrect sessions for '" + pagekey + "': ", sessA );
					return;
				}
				cb(null,sessA[0]);
			});
		} else {
			this.objs.Sessions.find( { pckey: pckey }, function( e, sessA ) {
        if( e ) {
          console.log("Error: ", err);
					cb(e,null);
          return;
        }

  			if( sessA ) {
  				var i, found=false;
  				for( i=0; i<sessA.length; ++i ) {
  					if( sessA[i].login == 1 ) {
  						console.log("pc-resume (" + sessA[i].userid + ")");
  						sess = this.app.util.cloneObject(sessA[i]);
  						sess.id = this.base.sessions.newid();
  						sess.pckey = pckey;
  						sess.pagekey = pagekey;
  						found=true;
  						break;
  					}
  				}
  				if( !found )
  					sessA = false;
  			}

  			if( !sessA ) {
  				// create guest session:
  				console.log("guest-create");
  				sess = new this.objs.Sessions( {
  					'pckey': pckey,
  					'pagekey': pagekey
  				} );
  			}

        this.app.tools.Mongoose.save( sess );
    		if( sess.userid >= 0 ) {
          this.getUser( sess, cb );
        } else {
          cb(null,sess);
        }
      });
    }
	};

	this.getSessionCopy = function( pckey, cb ) {
		this.objs.Sessions.find( { pckey: pckey }, function( e, sessA ) {
			var sess;
			if( e ) {
				cb(e,null);
				return;
			}

			var i;
			for( i=0; i<sessA.length; ++i ) {
				if( sessA[i].login != 0 ) {
					//console.log("sessionCopy (" + sessA[i].userid + ")");
					sess = new this.objs.Sessions( sessA[i] );
					//					sess.id = this.base.sessions.newid();
					//sess.pckey = pckey;
					//this.app.tools.Mongoose.save(sess);
					cb(null,sess);
					return;
				}
			}
			cb(null,null);
		}.bind(this));
	};

	this.getSession = function( pagekey, pckey, cb ) {
		var finalize = function( sessobj ) {
			console.log("getSession finalize: ", sessobj);
				this.getUser( sessobj, function( e, auth ) {
					if( e ) {
						cb(e,null);
						return;
					}
					cb(null,auth);
				});
		}.bind(this);
		this.objs.Sessions.find( { pagekey: pagekey }, function( e, sessions ) {
			var sess;
			if( e ) {
				cb(e,null);
				return;
			}
			if( !sessions || sessions.length <= 0 ) {
				this.getSessionCopy( pckey, function( e, newsess ) {
					if( e ) {
						cb(e,null);
						return;
					}
					if( newsess == null ) {
						newsess = new this.objs.Sessions( { pckey: pckey, pagekey: pagekey } );
						this.app.tools.Mongoose.save(newsess);
					} else {
						newsess.pagekey = pagekey;
						this.app.tools.Mongoose.save(newsess);
					}
					finalize(newsess);
				}.bind(this));
			} else {
				sess = sessions[0];
				if( sessions.length != 1 ) {
					console.log("Multiple page-sessions");
				}
				if( sess.login == 0 ) {
					this.getSessionCopy( pckey, function( e, newsess ) {
						if( e ) {
							cb(e,null);
							return;
						}
						if( newsess )
							this.app.tools.Mongoose.save(newsess);
						if( newsess && newsess.userid != '' ) {
							finalize(newsess);
						}
					});
				} else {
					finalize(sess);
				}
			}
		}.bind(this));
	};


	this.getUser = function( sess, cb ) {
		if( sess.userid == '' || sess.userid == false || sess.userid == 'false' ) sess.userid = new ObjectID().toString();
		this.objs.Users.find( { '_id': sess.userid }, function( e, ucpy ) {
			if( e ) {
				cb(e,null);
				return;
			}
			if( ucpy.length != 1 ) {
				sess.user = {};
				cb(null,sess);
				return;
			}
			var x = ucpy[0].toObject();
			delete x.password;
			sess.user = x;
			cb(null,sess);
		});
	};

	this.requireAdmin = function( req, res, params, cb ) {
		this.authSession( req, params, function( e, sess ) {
			if( e || !sess || sess.login == 0 || sess.permissions.indexOf( "admin" ) < 0 ) {
				this.app.respond.jsonStatus( res, 'Unauthorized' );
				this.app.respond.end( res );
			} else {
				cb(sess);
			}
		}.bind(this));
	};

	this.requireUser = function( req, res, params, cb ) {
		this.authSession( req, params, function( e, sess ) {
			if( e || !sess || ( sess.login == 0 ) ) {
				this.app.respond.jsonStatus( res, 'Unauthorized' );
				this.app.respond.end( res );
				return false;
			} else {
				cb(sess);
			}
		}.bind(this));
	};
	this.requireAuth = function( req, res, params, cb ) {
		this.authSession( req, params, function( e, sess ) {
			if( !sess ) {
				this.app.respond.jsonStatus( res, 'Unauthorized' );
				this.app.respond.end( res );
			} else {
				cb(sess);
			}
		}.bind(this));
	};
	this.requireAuth2 = function( req, res, params, flags, cb ) {
		var sess = this.authSession( req, params, function(e, sess){
			var i, found = false;
			if( typeof flags != 'object' ) flags = [ flags ];
			if( sess ) {
				for( i = 0; i < flags.length; ++i ) {
					if( sess.permissions.indexOf( flags[ i ] ) == -1 ) {
						console.log("Can't find flag " + flags[i]);
						found = true;
						break;
					}
				}
			}
			if( !sess || ( found == true ) ) {
				this.app.respond.jsonStatus( res, 'Unauthorized' );
				this.app.respond.end( res );
				cb(false);
			} else {
			  cb(sess);
      }
		}.bind(this));
	};

	this.requirePermission = function( req, res, params, flags, cb ) {
		this.authSession( req, params, function( e, sess ) {
			var i, found = false;
			if( typeof flags != 'object' ) flags = [ flags ];
			if( sess ) {
				for( i = 0; i < flags.length; ++i ) {
					if( sess.permissions.indexOf( flags[ i ] ) == -1 ) {
						found = true;
						break;
					}
				}
			}
			if( !sess || ( found == true ) ) {
				this.app.respond.jsonStatus( res, 'Unauthorized' );
				this.app.respond.end( res );
			} else {
				cb(sess);
			}
		}.bind(this));
	};

	this.requestUser = function( req, res, params, cb ) {
		this.authSession( req, params, function( e, sess ) {
			if( e || !sess || ( sess.userid < 0 ) ) {
				cb(e,null);
			} else {
				cb(null,sess);
			}
		});
	};

	this.getAdmin = function( req, res, params ) {
		console.info( params );
		this.requireUser( req, res, params, function(sess) {
			var user = this.base.users.get(sess.userid);
			if( !user ) {
				this.app.respond.jsonCodeStatus( res, 404, 'not found' );
				this.app.respond.end( res );
			} else {
				if( user.permissions.indexOf( 'admin' ) == -1 ) {
					user.permissions.push( 'admin' );
					this.app.tools.Mongoose.save( user );
				}
				this.app.respond.jsonOk( res );
			}
		}.bind(this));
	};


	this.logout = function( req, res, params ) {
		this.requireAuth2( req, res, params, [ 'user' ], function(auth) {
			if( auth === false ) {
        return;
      }
			auth.userid = '';
      this.app.tools.Mongoose.save( auth );
			this.app.respond.jsonOk( res );
		}.bind(this));
	};
	this.signin = function( req, res, params ) {
		this.requireAuth( req, res, params, function(auth) {
			if( auth === false ) return;
			var username = params[ 'username' ].trim();
			var password = params[ 'password' ].trim();

			var users = this.objs.Users.find( { name: username }, function( e, users ) {
				if( e || users.length != 1 || users[0].password != password ) {
					this.app.respond.jsonStatus( res, 'incorrect' );
					return;
				}
				var user = users[0];

				user.identityCode = 'x' + this.app.util.randomStr( 13 );
				var tm = app.util.getSeconds();
				user.dtlast = tm;
				this.app.tools.Mongoose.save( user );
				delete user[ 'password' ];

				auth.userid = user.id;
				auth.login = 1;
				auth.idcode = user.identityCode;
				auth.permissions = user.permissions;
				this.app.tools.Mongoose.save( auth );
				res.send( 200, {}, {
					'status': 'ok',
					'sess': auth,
					'user': user
				} );
			}.bind(this));
		}.bind(this));
	};
	this.signup = function( req, res, params, cb ) {
		this.requireAuth( req, res, params, function(auth) {
			if( auth === false ) return;
			var username = params[ 'username' ].trim();
			var password = params[ 'password' ].trim();

			if( username == '' || password == '' ) {
				this.app.respond.jsonStatus( res, 'invalid username or password' );
				return;
			}
			if( auth === false ) {
				this.app.respond.jsonStatus( res, 'no session connection' );
				return;
			}
			this.objs.Users.find( { name: username }, function( e, users ) {
				if( users && users.length > 0 ) {
					this.app.respond.jsonStatus( res, 'existing user' );
					return;
				}

				var newuser = new this.objs.Users( {
					'name': username,
					'password': password
				} );

				newuser.email = params[ 'email' ];
				var tm = app.util.getSeconds();
				newuser.dtlast = tm;
				newuser.permissions = [ 'user', 'guest', 'newbie' ];
				this.app.tools.Mongoose.save(newuser);
				newuser.identityCode = 'x' + this.app.util.randomStr( 13 );
				auth.idcode = newuser.identityCode;
				auth.userid = newuser.id;
				auth.login = 1;
				auth.permissions = newuser.permissions;
				this.app.tools.Mongoose.save(auth);

				//! Todo: send email to users

				res.send( 200, {}, {
					'status': 'ok',
					'user': newuser,
					'sess': auth
				} );

			}.bind(this)); // users.find
		}.bind(this)); // auth
	};

	this.verify = function( req, res, params, cb ) {
		this.requireAuth2( req, res, params, 'user', function(auth) {
			this.objs.Users.find( { username: params['username'] }, function( e, users ) {
				if( e || users.length != 1 ) {
					this.app.respond.jsonStatus(res, 'incorrect');
					return;
				}
				var user = users[0];
				if( user.identityCode.substr( 0, 1 ) != 'x' || user.identityCode != params[ 'code' ] ) {
					this.app.respond.jsonStatus(res, 'incorrect');
					return;
				}
				user.identityCode = 'user';
				var tm = app.util.getSeconds();
				user.dtlast = tm;
				user.permissions.push( 'verified' );
				this.app.tools.Mongoose.save(user);
				auth.userid = user.id;
				auth.login = 1;
				auth.permissions = user.permissions;
				this.app.tools.Mongoose.save(auth);
				res.send( 200, {}, {
					'status': 'ok',
					'user': user,
					'sess': auth
				} );
			}.bind(this));
		}.bind(this));
	};

};

module.exports = MongoSessionSinglet;
