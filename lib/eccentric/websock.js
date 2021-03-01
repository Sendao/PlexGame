var sockets = require('websocket');

/**
 * @constructor
 * @returns
 */
function WebSocket() {
  this.modlocaL = function() {
    this.wscli = false;
    this.wsscli = false;
    this.wssrv = false;
    this.wsssrv = false;
    this.socket = function() {
      if (this.wsssrv !== false) {
        return this.wsssrv;
      } else {
        return this.wssrv;
      }
    };

    /**
     * @memberOf WebSocket
     */
    this.work_sockets = function() {
      this.wssrv.workcycle();
      this.wsssrv.workcycle();
    };

    this.connect_socket_clients = function(wsclient, wssclient) {
      if (wssclient) {
        this.wsscli = wssclient;
      } else {
        this.wsscli = false;
      }
      this.wscli = wsclient;
    };

    this.connect_socket_servers = function(wsserver, wssserver, sockmain) {
      if (wssserver) {
        wssserver.app = this;
        this.wsssrv = wssserver;
        this.connect_secure_router(this.wsssrv.registerRouter(new sockmain.router(this)));
      } else {
        this.wsssrv = false;
      }
      wsserver.app = this;
      this.wssrv = wsserver;
      this.connect_router(this.wssrv.registerRouter(new sockmain.router(this)));
    };

    this.socket_routes = function(router) {
      var i;

      for (i in this.sing) {
        if (typeof this.sing[i].socket_routes == 'function') {
          this.ctrl[i].routes(router);
        }
      }
      for (i in this.ctrl) {
        if (typeof this.ctrl[i].socket_routes == 'function') {
          this.ctrl[i].socket_routes(router);
        }
      }
    };

  };

  this.client = function(host, proto) {
    this.client = new sockets.client();
    this.host = host;
    this.proto = proto;
    this.conn = null;
    this.queue = [];

    var cc = this; // warning: nonsense. how can this possibly. fine. never mind.
    this.client.on('connectFailed', function(err) {
      console.log('Could not connect internal socket ' + host + ":" + proto, err);
    });

    this.client.on('connect', function(conn) {
      console.log("Internal socket connected: " + host + ":" + proto);

      conn.on('error', function(err) {
        console.log("WSC error: ", err);
        this.close();
      });

      conn.on('close', function() {
        console.log("Internal socket closed. Reopening...");
        cc.client.connect(cc.host, cc.proto);
      });

      conn.on('message', function(msg) {
        if (msg.type == 'utf8') {
          console.log("Internal socket message: ", msg.utf8Data);
        }
      });

      cc.conn = conn;
      while (cc.queue.length > 0) {
        var msg = cc.queue.shift();
        cc.conn.sendUTF(msg);
        //console.log("sent wsc message");
      }
    });

    this.send = function(msg) {
      console.log("Client " + this.host + ": Send message: " + typeof msg);

      if (typeof msg != 'string') {
        msg['confirm'] = confirmcode;
        msg = JSON.stringify(msg);
      }

      if (this.conn == null) {
        this.queue.push(msg);
        return;
      }

      this.conn.sendUTF(msg);
    };

    this.client.connect(host, proto);

    console.log("Internal connection built.");
  };

  this.router = function(myapp) {
    this.app = myapp;
    this.routes = {};
    this.code = function(codename, obj) {
      if (!(codename in this.routes)) {
        this.routes[codename] = [];
      }
      this.routes[codename].push(obj);
    };
    this.routemsg = function(conn, code, msg) {
      var i = 0,
        len = this.routes[code].length;

      for (i = 0; i < len; ++i) {
        this.routes[code][i](conn, code, msg);
      }
    }
  };

  this.server = function(server_unit, main_handler) {
    this.sock = new sockets.server({
      'httpServer': server_unit,
      'autoAcceptConnections': false
    });
    this.protoc = 'echo-protocol';
    this.mainHandler = main_handler;
    this.myconns = [];
    this.myrouter = false;
    this.changes = {};
    this.confirmCodes = {};

    this.originAllowed = function(orig) {
      return true;
    };
    this.registerRouter = function(routerobj) {
      return this.myrouter = routerobj;
    };

    this.locateUser = function(pagekey, allow_failure=false) {
      var i;

      if( !pagekey || pagekey == 'undefined' ) {
        if( !allow_failure )
          this.app.util.throwStack("locateUser: no pagekey (" + pagekey + ")");
        return false;
      }
      //console.log("Find user " + targetCookie);
      for (i = 0; i < this.myconns.length; i++) {
        if (this.myconns[i].pagekey == pagekey) {
          //console.log("Found");
          //console.log("Found user '" + pagekey + "'");
          return this.myconns[i];
        }
      }
      //console.log("No user '" + pagekey + "'")
      return false;
    };

    this.changeProp = function(propid, data) {
      this.changes[propid] = data;
      this.quickcycle(this.workcycle.bind(this));
    };

    this.workcycle = function() {
      var i, len = this.myconns.length,
        j;
      var chx = this.changes; // obj clone?
      this.changes = {};

      console.log("websocketserver.workcycle()");

      var rt = app.util.getSeconds();

      for (j in this.confirmCodes) {
        // resend messages

        if (this.confirmCodes[j][1] < rt - (6 * this.confirmCodes[j][0])) {
          // 6 seconds old. resend
          this.confirmCodes[j][0]++;
          this.confirmCodes[j][2].send(this.confirmCodes[j][3], j);
        }
      }

      for (j in chx) {
        //console.log(chx[j]);
        for (i = 0; i < len; ++i) {
          this.myconns[i].send({
            'code': j,
            'data': chx[j]
          });
        }
      }
    };

    this.msgConfirm = function(ccc) {
      if (ccc in this.confirmCodes) {
        delete this.confirmCodes[ccc];
      }
    };

    this.initialize = function() {
      this.myconns = [];

      var cc = this;

      this.sock.on('request', function(request) {
        if (!cc.originAllowed(request.origin)) {
          request.reject();

          console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
          return;
        }

        var conn = request.accept(cc.protoc, request.origin);
        conn.pagekey = conn.pckey = '';
        conn.closed = false;
        cc.myconns.push(conn);
        if( conn.remoteAddress != "::ffff:" + cc.app.config.localip ) { // home
          console.log("Socket: new connection from " + conn.remoteAddress);
        }

        conn.send = function(str, confirmcode = null, useconfirm = true) {
          if (confirmcode == null && useconfirm ) {
            do {
              confirmcode = cc.app.util.randomString(8);
            } while (confirmcode in cc.confirmCodes);
          }
          var omsg = (typeof str == 'string') ? JSON.parse(str) : str;

          if( useconfirm ) {
            if (!('confirm' in omsg))
              omsg['confirm'] = confirmcode;
          }

          str = JSON.stringify(omsg);

          if( useconfirm ) {
            if (!(confirmcode in cc.confirmCodes))
              cc.confirmCodes[confirmcode] = [1, app.util.getSeconds(), this, str];
          }

          //console.log("Send: ", str);
          this.sendUTF(str);
        };

        conn.on('message', function(msg) {
          //console.log("Message type: " + msg.type);
          if (msg.type == 'utf8') {
            //console.log("WSS Received: ", msg.utf8Data );
            var data = JSON.parse(msg.utf8Data);
            if( data.code == 'reg98' ) {
              // register this client
              conn.pckey = data.pckey;
              conn.pagekey = data.pagekey;
              console.log("registered mongodb socket to pckey " + data.pckey + ". New Pagekey: " + conn.pagekey);
              // try to find their session
              var sess = cc.app.sing.mongosess.getSession( conn.pagekey, conn.pckey, function( e, sess ) {
                if( e ) {
                  console.log(e);
                  return;
                }
                if( sess ) {
                  if( sess.userid != -1 ) {
                    cc.app.sing.mongosess.getUser( sess.userid, function(e, user) {
                      sess.user = user;
                      conn.send({
                        'code': 'registered',
                        'pagekey': conn.pagekey,
                        'pckey': conn.pckey,
                        'sess': sess
                      });
                      console.log("(mongo user session connected)");
                    } );
                  } else {
                    conn.send({
                      'code': 'registered',
                      'pagekey': conn.pagekey,
                      'pckey': conn.pckey,
                      'sess': sess
                    });
                    console.log("(mongo guest session connected)");
                  }
                }
              } );

            } else if (typeof cc.myrouter == 'function') {
              cc.myrouter(conn, data.code, data, msg);
            } else if (typeof cc.mainHandler == 'function') {
              cc.mainHandler(conn, msg, data);
            }
          } else if (msg.type == 'binary') {}
        });

        conn.on('close', function() {
          console.log("Socket Connection from " + conn.remoteAddress + " closed.");
          cc.app.tools.Mongoose.closeClient( conn.pagekey );
          conn.closed = true;
          var i = cc.myconns.indexOf(conn);
          if (i != -1) {
            cc.myconns.splice(i, 1);
          } else {
            console.warn("WS connection unsafely pulled.");
            conn.valid = false;
          }
        });
      });
    };
  };
};

module.exports = WebSocket;
