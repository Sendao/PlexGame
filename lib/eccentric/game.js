var fs = require('fs');

function Game(app) {
  this.app = app;
  cc = this;

  this.modlocaL = function() {
    cc.app.game = cc.app.tools.Game;
    /*
    this.game = {
    	getObject: function( vtype, ident ) {
    	},
    	updateObject: function( vtype, obj ) {

    	}
    };
    */
  };

  this.server_online = false;
  this.disabled = false;
  this.startup = function() { this.myStartup(); };

  this.myStartup = function() {
    console.log("game.startup");
    this.loadTypes();
    if( this.app.szn.disabled ) {
      this.disabled = true;
      this.server_offline = true;
      return;
    }
    this.app.szn.registerCastle();
    this.app.castle.registerClasses();
    this.app.ipc.register(this.myHandler.bind(this));
    this.server_online = true;
    this.loadTables();
    console.log("game.startup completed");
  };

  this.loadTypes = function() {
    console.log("game.loadSznTypes");
    this.app.szn.loadTypes();
    this.loaded_types_at = new Date().getTime();
    this.type_message = this.app.szn.typeIdByName('message');
    this.type_command = this.app.szn.typeIdByName('command');
    this.type_omap = this.app.szn.typeIdByName('omap');
    this.type_object = this.app.szn.typeIdByName('object');
    this.type_concept = this.app.szn.typeIdByName('concept');
    console.log("game.loadSznTypes completed");
  };

  this.loadTables = function(transmit_for = 'system_tables') {
    this.app.game.transmit(transmit_for, this.app.game.Command( 40 ) );
  };

  this.loadTableIndex = function(table) {
    this.app.game.transmit('system_index.' + table, this.app.game.Command( 43, { 'db': table } ));
  };

  this.transmissions = {};

  this.tables = {};
  this.dbx = {};

  this.myHandler = function(keycode, msg, datalen) {
    var lines;
    var tx = this.transmissions[keycode];
    //console.log("myHandler(" + keycode + ":" + tx[1] + ")");
    //console.log(msg);
    var runcode = tx[1];

    var ldata = msg.label.split(",");
    if( ldata.length > 0 ) { // for db get results: store data in local lookup area
      if( ldata[0] == 'db' ) {
        var table = ldata[1];
        var objid = ldata[2];
        if( !(table in this.dbx) ) this.dbx[table] = {};
        this.dbx[table][objid] = msg.data;
      }
    }

        // Auto-absorb data into base
    if( runcode == 'system_tables' ) {
      lines = msg.data.split("\n");
        console.log("Keycode system_tables: got data: ", lines);

      var rowcount = parseInt(lines[1]);
      //console.log("Rowcount: " + rowcount + ", lines[1] = " + lines[1]);
      var typedata;
      rowcount = rowcount+2;
      for( var i=2; i<rowcount; ++i ) {
        //console.log("Load table index for " + i + "/" + rowcount + ": " + lines[i]);
        typedata = this.app.szn.typeByName(lines[i]);
        this.tables[ lines[i] ] = { 'table': lines[i], 'vars': typedata ? typedata.vars : [] };
        this.loadTableIndex( lines[i] );
      }
    } else if( runcode.indexOf("system_index.") == 0 ) {
      var r = runcode.split(".");
      var table = r[1];

      lines = msg.data.split("\n");
      var rowcount = parseInt( lines[1] );
      this.tables[ table ].ids = [];
      this.tables[ table ].idents = [];
      for( var i=2; i<rowcount+2; ++i ) {
        var ids = lines[i].split(",");
        //console.log("Add to " + table + ": ", ids);
        this.tables[ table ].ids.push( ids[0] );
        this.tables[ table ].idents.push( ids[1] );
      }
    } else if( runcode == 'system' ) {
      console.log("mySystemHandler");
    }


    var user = this.app.locateUser(tx[1]);

    //var processed_data = this.app.szn.readJSON( this.app.szn.typeByName("message"), data.data, false );
    //if( processed_data !== null ) {
    //  console.log("Proc'd data: ", data.data);
    //}
    //console.log("xmit", datalen, data);
    //console.log(user);
    if (user) {
      //console.log("Hm " + typeof msg.data + ": " + msg.length);
      var msgdata = this.app.util.printJSON(msg.data);
      //console.log("Send " + typeof msg.data, msg.data instanceof Array, Array.isArray(msg.data), msg.data);
      //console.log("Xmit " + typeof msgdata, msgdata);
      var x  = {
        'code': 'game',
        'source': 'game',
        'data': msgdata,
        'label': msg.label,
        'len': datalen
      };
      //console.log("Really send", x);
      user.send(x);
    } else {
      //console.log("not sent");
    }

    return user ? true : false;
  };

  this.publicTables = function()
  {
    var tx = this.app.util.cloneObject( this.tables );
    var tname, tp, tgt, ttype;
    for( var i in tx ) {
      tgt = this.tables[i];
      var lclass = this.app.szn.typeByName( i );
      if( lclass != null ) {
        tx[i].parentclass = lclass.parentclass;
      } else {
        tx[i].parentclass = -1;
      }
      tx[i].id = this.app.szn.classes[ i ] ;

      while( tgt != null ) {
        for( var j in tgt.vars ) {
          // main type
          ttype = tgt.vars[j].type;
          tp = this.app.szn.typeById( ttype );
          if( tp == null )
            tname = 'string';//:' + ttype;
          else
            tname = tp.name;
          tx[i].vars[j].type = tname;

          // objtype
          tp = this.app.szn.typeById( tgt.vars[j].objtype );
          if( tp == null )
            tname = 'string';//:' + tgt.vars[j].objtype;
          else
            tname = tp.name;
          tx[i].vars[j].objtype = tname;

        }
        if( tgt.parentclass > 0 ) {
          console.log("Next class " + tgt.parentclass);
          tgt = this.tables[tgt.parentclass];
        } else tgt = null;
      }
      //console.log("Create class " + i + ": ", tx[i].vars);
    }
    return tx;
  }

  this.getAnyKeycode = function() {
    while (true) {
      var code = this.app.util.randomString(8);
      if (code in this.transmissions) continue;
      return code;
    };
  };

  this.transmit = function(pagekey, messagepacket) {
    if (typeof messagepacket == 'object') {
      var b, len;
      [b, len] = this.app.szn.writeObject(this.app.szn.typeByName('message'), messagepacket);
      messagepacket = b;
    }
    var keycode = this.getAnyKeycode();
    this.transmissions[keycode] = [0, pagekey, messagepacket];
    this.app.ipc.send(messagepacket, keycode);
  };

  this.loaded_types_at = 0;
  this.type_message = -1;
  this.type_command = -1;
  this.type_object = -1;
  this.type_omap = -1;

  this.testTypes = function() {
    // stat the type file
    // compare to loaded_types_at
    // reload if necessary
  };

  this.getVar = function(type, id) {
    //! if it was loaded from ipc in the past 5 seconds, retrieve from database
    if (this.server_online) {
      //	! next load from ipc connection
    } else {
      //! finally attempt to load from szn database
    }
  };

  this.updateVar = function(type, id, obj) {

    if (this.server_online) {
      //	! write over ipc
    } else {
      //! write to szn database instead
    }
  };

  this.Command = function(cmdid, params, tparams) {
    if (!this.server_online)
      this.myStartup();

    var msg = cc.app.szn.nullObject(this.type_message);
    var cmd = cc.app.szn.nullObject(this.type_command);
    cmd.cmdid = cmdid;
    cmd.opt = this.app.szn.nullObject(this.app.szn.typeIdByName('omap'), 64);
    for (var i in params) {
      cmd.opt.set(i, this.app.szn.realTypeFor(this.app.szn.type_string), params[i]);
    }
    if( typeof tparams != 'undefined' ) {
      for (var i in tparams) {
        cmd.opt.set(i, this.app.szn.realTypeFor(tparams[i][0]), tparams[i][1]);
      }
    }
    msg.type = this.type_command;
    var b, len;
    [b, len] = cc.app.szn.writeObject(cc.app.szn.typeByName('command'), cmd);
    msg.data = b;
    return msg;
  };
  this.Object = function(obj) {
    if (!this.server_online)
      this.myStartup();
    var msg = this.app.szn.nullObject(this.type_message);
    msg.type = this.type_object;
    msg.data = obj;
    return msg;
  };

};

module.exports = Game;
