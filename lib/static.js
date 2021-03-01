var fs = require('fs');
var async = require('async');

var staticApp = {

    validDirs: [ 'js', 'js/src', 'src', 'js/plex', '.well-known/acme-challenge', 'acme-challenge', '.well-known', 'bin', 'css', 'style', 'view', 'view/game', 'views', 'img', 'images', 'tpl' ],
    formats: {
        'js': 'text/javascript',
        'html': 'text/html',
        'tpl': 'text/html',
        'txt': 'text/txt',
        'css': 'text/css',
        'bin': 'application/x-binary',
        'exe': { 'ansi':'application/exe' },
        'json': { 'ansi':'application/json' },
        'mp4': { 'ansi':'video/mp4' },
        'png': { 'ansi':'image/png' },
        'jpg': { 'ansi':'image/jpeg' },
        'jpeg': { 'ansi':'image/jpeg' },
        'gif': { 'ansi':'image/gif' },
        'ico': { 'ansi':'image/gif' },
        'pdf': { 'ansi':'application/pdf' },
        'txt': 'text/plain',
        'dds': 'application/x-binary',
        'bz2': { 'ansi':'application/bzip2' },
        'tar': { 'ansi':'application/tar' },
        'zip': { 'ansi':'application/zip' },
        'swf': { 'ansi':'application/x-shockwave-flash' }
    },

    normalOutput: function( req, res, data )
    {
      var body;

      if( Array.isArray(data) ) {
        this.app.respond.header(res, "Content-Type", data[0]);
        body = data[1];
      } else {
        this.app.respond.header(res, "Content-Type", "text/html");
        body = data;
      }

      //console.log("normal output 200 ", res['headers']);
      res.send( 200, res['headers'], body );
    },

    staticHandler: function( req, res, filename, cb ) {
      if( !cb || typeof cb != 'function' ) cb = this.normalOutput;
      if( filename.indexOf('/') != -1 ) {
          res.send(404, { 'Content-Type': 'text/html' }, '<html><body>/ Forbidden.</body></html>' );
          return;
      }
    	var whoisit = 'remoteAddress' in req.connection ? req.connection.remoteAddress : "unknown";

//      var sourcepages = [ 'index.html', 'card.html', 'game.html', 'shadows.html', 'projects.html', 'seaplane.html', 'gridiron.html' ];

    /*
      if( !fs.existsSync('./static/' + filename) ) {
      	this.report404('./static/' + filename, whoisit);
        res.send(404, { 'Content-Type': 'text/html' }, '<html><body>File not found.</body></html>' );
        return;
      }*/
      async.waterfall(
        [
        function(cb2) {
          fs.stat( './static/' + filename, cb2 );
        },
        function(fstat, cb2) {
          //console.log("File stat: ", fstat['mtime']);
          var modtime = new Date( fstat['mtime'] );
          this.app.respond.header(res, "Cache-Control", "max-age=31536000");
          this.app.respond.header(res, "Last-Modified", modtime.toUTCString());
          if( 'if-modified-since' in req.headers ) {
            var modsince = new Date(req.headers['if-modified-since']);
            if( modsince.getTime()+1000 >= modtime.getTime() ) {
              cb2({'code':'ECACHED'});
              return;
            } else {
              console.log(modsince.getTime() + " < " + modtime.getTime());
            }
          }
          this.staticReadFile2( './static/' + filename, cb2 );
        }.bind(this) ],
        function(err, data) {
          if( err ) {
            if( err.code == 'ENOENT' ) {
              this.report404('./static/' + filename, whoisit);
              res.send(404, { 'Content-Type': 'text/html' }, '<html><body>File not found.</body></html>' );
            } else if( err.code == 'ECACHED' ) {
              console.log("File " + filename + " was cached.");
              var ipaddr = req.connection.remoteAddress.split(":")[3];
              console.log(ipaddr + " : " + req.headers['user-agent']);
              this.app.consoleReverseIP(ipaddr);
              if( filename.indexOf('.html') != -1 ) {
                var pagekey = this.app.util.randomStr(14);
                console.log("We add a key: " + pagekey);
                this.app.respond.cookie( res, 'pagekey', pagekey );
              }
              res.send(304, res.headers, '' );
            } else {
              console.log(err);
              console.log("Error while reading file " + filename);
              if( typeof err != 'string' ) err = 'unknown';
              res.send(404, { 'Content-Type': 'text/html' }, '<html><body>File not found.</body></html><!--' + err + '-->' );
            }
            return;
          }
          if( filename.indexOf('.html') != -1 ) {
    //      for( var i=0; i<sourcepages.length; ++i ) {
    //        if( filename.indexOf( sourcepages[i] ) != -1 ) {
            if( !('pckey' in req.cookies) ) {
              this.app.respond.cookie( res, 'pckey', this.app.util.randomStr(14) ); // 14oz. cookies!
            } else {
              this.app.respond.cookie( res, 'pckey', req.cookies.pckey );
            }
            var pagekey = this.app.util.randomStr(14);
            console.log(filename + " key: " + pagekey);
            var ipaddr = req.connection.remoteAddress.split(":")[3];
            console.log(ipaddr + " : " + req.headers['user-agent']);
            this.app.consoleReverseIP(ipaddr);
            this.app.respond.cookie( res, 'pagekey', pagekey ); // 14oz. cookies! x2!
          } else {
            console.log(filename);
          }

          var i, ext;
          i = filename.lastIndexOf(".");
          ext = filename.substr(i+1);
          for( i in this.formats ) {
            if( ext == i ) {
              if( this.formats[i] == 0 ) {
                cb(req,res,data);
              } else if( typeof this.formats[i] == 'string' ) {
                cb(req,res, [this.formats[i], data] );
              } else {
              	cb(req,res, [this.formats[i].ansi, data] );
              }
              return;
            }
          }
          console.log("Unknown extension " + ext + " in " + filename);
          cb(req, res, ['', data]);
      }.bind(this));
    },

    reportTrack: function( repwhich, obj ) {
    	if( !(repwhich in this.self.app.tracks) ) this.self.app.tracks[repwhich] = [];
    	this.self.app.tracks[repwhich].push( obj );//[ d, ipaddr, url ] );
    },

    report404: function( url, ipaddr ) {
    	var d = new Date();
    	this.reportTrack( '404', [ d, ipaddr, url ] );

    	var h = fs.openSync('/tmp/rad404.log', 'a');
    	buf = d + '=404=' + ipaddr + '=' + url + "\n";
    	fs.writeSync(h, buf);
    	fs.closeSync(h);
    },

    report200: function( url, ipaddr ) {
    	var d = new Date();
    	this.reportTrack( '200', [ d, ipaddr, url ] );

    	var h = fs.openSync('/tmp/rad200.log', 'a');
    	buf = new Date() + '=200=' + ipaddr + '=' + url + "\n";
    	fs.writeSync(h, buf);
    	fs.closeSync(h);
    },

    reportCommon200: function( url, ipaddr ) {
    	var d = new Date();
    	this.reportTrack( '200c', [ d, ipaddr, url ] );

    	var h = fs.openSync('/tmp/radCommon.log', 'a');
    	buf = new Date() + '=200=' + ipaddr + '=' + url + "\n";
    	fs.writeSync(h, buf);
    	fs.closeSync(h);
    },


    reportError: function( code, url, ipaddr ) {
    	var d = new Date();
    	this.reportTrack( 'err', [ d, ipaddr, url ] );

    	if( code == 404 ) {
    		report404(url,ipaddr);
    		return;
    	}
    	var h = fs.openSync('/tmp/raderror.log', 'a');
    	buf = new Date() + '=' + code + '=' + ipaddr + '=' + url + "\n";
    	fs.writeSync(h, buf);
    	fs.closeSync(h);
    },

    reportrequest: function( url, ipaddr ) {
    	var d = new Date();
    	this.reportTrack( 'req', [ d, ipaddr, url ] );

    	var h = fs.openSync('/tmp/radrequest.log', 'a');
    	buf = new Date() + '=req=' + ipaddr + '=' + url + "\n";
    	fs.writeSync(h, buf);
    	fs.closeSync(h);
    },

    directoryHandler: function( req, res, dirname, filename, cb ) {

      if( !cb || typeof cb != 'function' ) cb = this.normalOutput;
      if( ( this.validDirs.indexOf(dirname) == -1 ) || filename.indexOf('/') != -1 ) {
      	console.log("Forbidden request.");
        res.send(404, { 'Content-Type': 'text/html' }, '<html><body>Forbidden directory.' + this.validDirs.join(" ") + '</body></html>' );
        return;
      }

    	var whoisit = 'remoteAddress' in req.connection ? req.connection.remoteAddress : "unknown";

      //console.log("Dirname=" + dirname);
      if( dirname == "c" || dirname == "card/c" ) {
        console.log("Card file found");
        var fns = filename.split("/");
        var pid = fns[ fns.length-1 ];
        this.app.ctrl.card.retrieveCache( req, res, pid, cb );
        return;
      }

/*
      if( !fs.existsSync('./static/' + dirname + '/' + filename) ) {
      	this.report404('./static/' + dirname + '/' + filename, whoisit);
        res.send(404, { 'Content-Type': 'text/html' }, '<html><body>File not found.</body></html>' );
        return;
      } */
      async.waterfall(
        [ function(cb2) {
          fs.stat( './static/' + dirname + '/' + filename, cb2 );
        },
        function(fstat, cb2) {
          //! handle cache time stuff
          //console.log("Dirfile stat: ", fstat['mtime']);
          var modtime = new Date( fstat['mtime'] );
          this.app.respond.header(res, "Cache-Control", "max-age=31536000");
          this.app.respond.header(res, "Last-Modified", modtime.toUTCString());
          if( 'if-modified-since' in req.headers ) {
            var modsince = new Date(req.headers['if-modified-since']);
            if( modsince.getTime()+1000 >= modtime.getTime() ) {
              console.log("Exit with header");
              cb2({'code':'ECACHED'});
              return;
            //} else {
              //console.log(modsince.getTime() + " < " + modtime.getTime());
            }
          }
          //console.log("Headers: ", req.headers);
          this.staticReadFile2( './static/' + dirname + '/' + filename, cb2 );
        }.bind(this) ],
        function(err, data) {
          if( err ) {
            if( err.code == 'ENOENT' ) {
              this.report404('./static/' + dirname + '/' + filename, whoisit);
              res.send(404, { 'Content-Type': 'text/html' }, '<html><body>File not found.</body></html>' );
            } else if( err.code == 'ECACHED' ) {
              console.log("File " + dirname + '/' + filename + " was cached.");
              res.send(304, { 'Content-Type': 'text/html' }, '' );
            } else {
              console.log(err);
              console.log("Error while reading file " + dirname + '/' + filename);
              if( typeof err != 'string' ) err = 'unknown';
              res.send(404, { 'Content-Type': 'text/html' }, '<html><body>File not found.</body></html><!--' + err + '-->' );
            }
            return;
          }

          var i;
          for( i in this.formats ) {
              if( filename.indexOf(i) != -1 ) {
                  if( this.formats[i] == 0 ) {
                    cb(req,res,data);
                  } else if( typeof this.formats[i] == 'string' ) {
                    cb(req,res, [this.formats[i], data] );
                  } else {
                  	cb(req,res, [this.formats[i].ansi, data] );
                  }
                  return;
              }
          }
          console.log("Unknown extension in " + dirname + "/" + filename);
          cb(req, res, ['', data]);
        }.bind(this));
    },

    staticReadBinary2: function( filename, cb ) {
      var whoami = this;
      //console.log("Binary read " + filename);
      fs.readFile( filename, 'binary', function(err, data) {
        if( err ) {
          console.log("Error while reading binary file " + filename);
          cb('404.');
          return;
        }
        if( typeof data == 'object' ) {
          data = data.toString("binary");
        }

        cb(null, data);
      });
    },

    staticReadFile2: function( filename, cb ) {
      var whoami = this;
      var fne = filename.split('.');
      var ext = fne[fne.length-1];
      if( ext in this.formats && typeof this.formats[ext] != 'string' ) {
        return this.staticReadBinary2(filename,cb);
      }
      //console.log("Text read " + filename, ext, this.formats[ext]);
      fs.readFile( filename, 'utf-8', function(err, data) {
        if( err ) {
          console.log("Error while reading static file " + filename, err);
          cb('404 (' + filename + ').');
          return;
        }
        var n, m, o;
        var includefilename;
        var subfile;
        var found = false;
        var use_extend_include="#includejs"; // #includejs [file]
        var use_extend_data="#data"; // #data [length] [db] [table] [queryval] [querytype] [queryparam] [queryval..]
        var useData, use_data;
        var data_length, data_db, data_table, data_query;
        var dataQueries;

        if( filename.indexOf(".html") != -1 ) {
          use_extend_include="#include";
        }
        async.whilst(
          function() { return data.indexOf(use_extend_include) != -1; },
          function (cb2) {
            n=data.indexOf(use_extend_include);
            m = n + use_extend_include.length + 1;
            o = data.indexOf("\n", m);
            if( o < 0 ) o = 0;
            includefilename = data.substring( m, o ).trim();
            if( fs.existsSync('./static/' + includefilename) == false ) {
            	data = data.slice(0, n) + '404' + data.slice(o);
            	cb2(null,true);
            	return;
            }
            whoami.staticReadFile2( './static/' + includefilename, function( err, data2 ) {
              if( err ) {
                if( typeof err != 'string' ) err = 'unknown';
                data2 = err;
              }
              data = data.slice(0, n) + data2 + data.slice(o);
              cb2(null,true);
            } );
          },
          function (err, results) {
            cb(err, data);
            return;
          }
        );
      }.bind(this));
    },

    indexHandler: function( req, res ) {
      this.staticHandler(req,res,"index.html", function(req,res,data) {
        var body;
        if( Array.isArray(data) ) {
          body = data[1];
        } else {
          body = data;
        }

        //body += "\n<script language=javascript>\n";
        //! add any needed authentication tokens here
        //body += "//script complete;\n";
        //body += "</script>\n";

        this.app.respond.header(res, "Content-Type", "text/html");
        res.send(200, res.headers, body );
      }.bind(this));
    },

    routes: function( router ) {
      router.root.bind( this.indexHandler.bind(this) );
      for( var i in this.validDirs ) {
      	//console.log("Route for " + this.validDirs[i]);
      	router.get( new RegExp('(' + this.validDirs[i] + ')/([^/]+)$') ).bind( this.directoryHandler.bind(this) );
      }
      router.get(/cgi.+$/).bind( this.indexHandler.bind(this) );
      router.get(/([^/]+)$/).bind( this.staticHandler.bind(this) );
    },

    run: function(exports) {
      for( i in this ) {
        if( typeof this[i] == 'function' ) exports[i] = this[i].bind(this);
        else exports[i] = this[i];
      }
      this.self = this;
      exports['self'] = this;
    }

};

staticApp.run(module.exports);
