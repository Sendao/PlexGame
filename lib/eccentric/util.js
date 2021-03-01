//var wait = require('wait.for');
var dns = require('dns');

function Util(app) {
    this.app = app;
    var cca = app;
    this.sock = null;
	/*
    this.FibreRing = function( cb, obj ) {
        if( typeof obj != 'undefined' )
            cb = cb.bind(obj);
        return function() { wait.launchFiber( cb ) };
    };
    */

    this.modlocaL = function() {

    	// Authentication
    	    this.requireAdmin = function(r, s, p)
    	    {
    	        return this.sing.sess.requireAdmin(r,s,p);
    	    };
    	    this.requireUser = function(r, s, p)
    	    {
    	        return this.sing.sess.requireUser(r,s,p);
    	    };
          this.requestUser = function(r, s, p)
          {
              return this.sing.sess.requestUser(r,s,p);
          };
    	    this.requireAuth2 = function(r, s, p, flags)
    	    {
    	        return this.sing.sess.requireAuth2(r,s,p,flags);
    	    };
    	    this.requireAuth = function(r, s, p)
    	    {
    	        return this.sing.sess.requireAuth(r,s,p);
    	    };
    	    this.authSession = function(s, p)
    	    {
    	        return this.sing.sess.authSession(s, p);
    	    };
    	    this.getSession = function(s, p)
    	    {
    	        return this.sing.sess.getSession(s, p);
    	    };
    	    this.getUser = function(id)
    	    {
    	        return this.sing.sess.getUser(id);
    	    };

          this.splitBy = function(src, tokens)
          {
            var i,j,searchFrom;
            var firstFound,firstToken;
            var foundThis;
            var tokens=[];

            for( searchFrom=0; searchFrom< src.length; ) {
              firstFound=src.length;
              firstToken=false;
              for( j=0; j<tokens.length; ++j ) {
                if( (foundThis=src.indexOf(tokens[j],searchFrom)) != -1 ) {
                  if( foundThis < firstFound ) {
                    firstFound = foundThis;
                    firstToken = tokens[j];
                  }
                }
              }
              if( firstToken !== false ) {
                if( firstFound > searchFrom ) {
                  tokens.push(str.substr(searchFrom,firstFound-searchFrom));
                }
                tokens.push( firstToken );
                searchFrom = firstFound + firstToken.length;
              } else {
                tokens.push(str.substr(searchFrom,src.length-searchFrom));
                break;
              }
            }
            return tokens;
          };


    	    this.MrequireAdmin = function(r, s, p, c)
    	    {
    	        this.app.sing.mongosess.requireAdmin(r,s,p,c);
    	    };
    	    this.MrequireUser = function(r, s, p, c)
    	    {
    	        this.app.sing.mongosess.requireUser(r,s,p,c);
    	    };
          this.MrequestUser = function(r, s, p, c)
          {
              this.app.sing.mongosess.requestUser(r,s,p,c);
          };
    	    this.MrequireAuth2 = function(r, s, p, flags, c)
    	    {
    	        this.app.sing.mongosess.requireAuth2(r,s,p,flags,c);
    	    };
    	    this.MrequireAuth = function(r, s, p, c)
    	    {
    	        this.app.sing.mongosess.requireAuth(r,s,p,c);
    	    };
    	    this.MauthSession = function(s, p, c)
    	    {
    	        this.app.sing.mongosess.authSession(s, p, c);
    	    };
    	    this.MgetSession = function(s, p, c)
    	    {
    	        this.app.sing.mongosess.getSession(s, p, c);
    	    };
    	    this.MgetUser = function(id, c)
    	    {
    	        this.app.sing.mongosess.getUser(id, c);
    	    };


    	    // Global users
    	    this.sendTo = function(key, msg)
    	    {
    	        var user = this.locateUser(key);
    	        user.send(msg);
    	    };

    	    this.confirmSocketMsg = function( ccc ) {
    	    	return this.wsssrv.msgConfirm(ccc);
    	    };

    	    this.locateUser = function(key, allow_failure=false)
    	    {
    	        var cliconn=false;
    	        if( this.wsssrv )
    	            cliconn = this.wsssrv.locateUser( key, allow_failure );
    	        if( !cliconn )
    	            cliconn = this.wssrv.locateUser( key, allow_failure );
    	        return cliconn;
    	    };

          this.reversedIps = {};
          this.consoleReverseIP = function(ipaddr)
          {
            this.reverseLookup(ipaddr, function(err, tgtip, domain) {
              if( err ) console.log("Cannot lookup " + ipaddr + "\n");
              else console.log( (tgtip==ipaddr ? "*" : "") + tgtip + ": " + domain + "\n" );
            });
          };
          this.reverseLookup = function(ip,handler) {

            if( ip in this.reversedIps ) {
              var i;

              console.log("ipaddr cached");

              for( i=0; i < this.reversedIps[ip].length; i+=2 ) {
                handler(null, this.reversedIps[ip][0], this.reversedIps[ip][1]);
              }
              return;
            }
          	dns.reverse(ip,function(err,domains){
          		if(err!=null)	{
                handler(err);
                return;
              }

              this.reversedIps[ip] = [];
          		domains.forEach(function(domain){
          			dns.lookup(domain,function(err, address, family){
                  this.reversedIps[ip].push( address, domain );
                  handler(null, address, domain);
          			}.bind(this));
          		}.bind(this));
          	}.bind(this));
          }

    	    this.respond = {
    	    		journey: cca.journey,
              header: function( res, key, val, exp ) {
                if( typeof exp == 'undefined' ) exp = '';
                if( !res.myheads ) res.myheads = {};
                res.myheads[key] = val;//[val,exp];
                if( !res.headers ) res.headers = {};
                res.headers[key] = val;//[val,exp];
              },
              cookie: function( res, key, val, exp ) {
                if( typeof exp == 'undefined' ) exp = '';
                if( !res.mcset ) res.mcset = {};
                res.mcset[key] = val;
                var k = res.mcset;
                if( !res.myheads ) res.myheads = {};
                if( !res.headers ) res.headers = {};
                var cstr = Object.keys(k).map( (x) => { return x + "=" + k[x]; } ).join(",");
                var cstr2 = Object.keys(k).map( (x) => { return x + "=" + k[x]; } ).join(";");
                res.myheads['Set-Cookie'] = "cookies=" + cstr + ";" + cstr2;
                res.headers['Set-Cookie'] = "cookies=" + cstr + ";" + cstr2;
              },
    	    		jsonOk: function(res, obj) {
                if( !res.myheads ) res.myheads = {};
	    	        res.send(200, res['myheads'], {"status":"ok", 'data':obj} );
    	    		},
    	    		jsonError: function(res, code,message) {
                if( !res.myheads ) res.myheads = {};
	    	        res.send(code, res['myheads'], {"status":"error", 'code':code, 'message':message} );
    	    		},
    	    		jsonStatus: function(res, status, message) {
                if( !res.myheads ) res.myheads = {};
	    	        res.send(200, res['myheads'], {"status":status, 'message':message} );
    	    		},
    	    		jsonCodeStatus: function(res, code, status) {
                if( !res.myheads ) res.myheads = {};
	    	        res.send(code, res['myheads'], {"status":status, 'code': code} );
    	    		},
              body: function(res, body='', runCode=200) {
                console.log("Headers", res['myheads']);
                res.send(runCode, res['myheads'], body);
              },
    	    		end: function(res) {
    	    			console.log("Please do not use response.end, it is not a thing.");
    	    		}
    	    };

    };

    /*
    this.find = function() {
        this.cb.apply( null, arguments );
    };

    this.fin = function( runner, thisArg, args ) {

        var oldcb = args[ args.length-1 ];
        var carryobj = { 'cb': oldcb };
        args[ args.length-1 ] = this.find.bind( carryobj );

        runner.apply( thisArg, args );
    };
    */

    /*
    this.ShoeSock = function( runner, thisArg, args ) {
        this.sock = new Sock( "ws://localhost:8080", "echo-protocol" );
        ock.send({'code':'c1'});

        var oldcb = args[ args.length-1 ];
        args[ args.length-1 ] = this.ShoeHorn;

        runner.apply( thisArg, args );
    };

    this.FibreSock = function( cb ) {

    }
    */
}

module.exports = Util;
