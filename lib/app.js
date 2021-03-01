var fs = require('fs');
var Util = require('./tool/util.js');
var File = require('./tool/file.js');
var Web = require('./tool/web.js');

var apps = [];

module.exports = function ModularApp() {
  this.packages = [];
  this.util = new Util(this);
  this.file = new File();
  this.router = false;
  this.routerS = false;
  this.started = false;
  this.tracks = {};
  this.cleaners = {
    '404': 60,
    '200': 3600,
    '200c': 1200,
    'err': 8600,
    'req': 60
  };

  this.runtimeCode = this.util.randomString(8);
  console.log("Runtime Code is " + this.runtimeCode);

  this.srv = {
    'http_port': 80,
    'ssl_port': 443
  };

  this.initialize = function(app_static) {
    this.app_static = app_static;
    if (!('port' in this.config))
      this.config['port'] = this.srv['http_port'];
    if (!('sslport' in this.config))
      this.config['sslport'] = this.srv['ssl_port'];
    if (!('hostname' in this.config)) {
      var hostname = os.hostname();
      if (hostname.indexOf(".") == -1 && 'default_hostname' in this.config) {
        hostname = this.config['default_hostname'];
      }
      this.config['hostname'] = hostname;
    }
  };

  this.testAndStart = function() {
    this.web = new Web(this);
    this.web.initialize();
    this.tester.runTests();

    for (var i in this.sing) {
      if ('onLoad' in this.sing[i]) {
        this.sing[i].onLoad(this);
      }
    }
    /* -- onLoad happens earlier for tools
    for (var i in this.tools) {
      if ('onLoad' in this.tools[i]) {
        this.tools[i].onLoad(this);
      }
    }
    */

    this.web.startup();
    this.startup();
  };

  this.configure = function(packages) {
    for (var i = 0; i < packages.length; ++i) {
      if( this.packages.indexOf( packages[i] ) == -1 ) {
        this.packages.push(packages[i]);
      }
    }
    for (i = 0; i < this.packages.length; ++i) {
      this.addModule(this.packages[i]);
    }

    this.finishSinglets();
};

  // logging
  this.loggers = {
    'database': {
      'enabled': false,
      'target': 'console'
    },
    'dbsort': {
      'enabled': false,
      'target': 'console'
    },
    'coremessage': {
      'enabled': false,
      'target': 'console'
    },
    'dbinits': {
      'enabled': false,
      'target': 'console'
    },
    'findby': {
      'enabled': false,
      'target': 'console'
    },
    'searchby': {
      'enabled': false,
      'target': 'console'
    },
    'dbmsg': {
      'enabled': false,
      'target': 'console'
    },
    'dbindex': {
      'enabled': false,
      'target': 'console'
    },
    'dbempties': {
      'enabled': false,
      'target': 'console'
    },
    'szn': {
      'enabled': false,
      'target': 'console'
    },
    'sznspam': {
      'enabled': false,
      'target': 'console'
    }
  };

  this.logSet = function(handle, shouldlog, configsetup) {
    if (!(handle in this.loggers)) {
      if (typeof configsetup == 'undefined')
        configsetup = {
          'target': 'console'
        };
      this.loggers[handle] = configsetup;
    }
    this.loggers[handle].enabled = shouldlog;
  };

  this.logIf = function() {
    var h = arguments[0];
    var handle;
    var passed = false;
    if (typeof arguments[0] == 'object' || typeof arguments[0] == 'array') {
      for (var i in arguments[0]) {
        handle = arguments[0][i];
        if (handle in this.loggers && this.loggers[handle].enabled == true) {
          passed = true;
          break;
        }
      }
      if (!passed)
        return false;
    } else {
      handle = "" + arguments[0];

      if (!(handle in this.loggers))
        // default configuration
        this.loggers[handle] = {
          'target': 'console',
          'enabled': true
        };

      if (this.loggers[handle].enabled == false)
        return false;
    }
    var i, msg = handle[0].toUpperCase() + handle.slice(1) + ": ";

    for (i = 1; i < arguments.length; ++i) {
      if (typeof arguments[i] != 'string') {
        msg += JSON.stringify(arguments[i]);
      } else {
        msg += arguments[i];
      }
      if (i + 1 < arguments.length) msg += "  ";
    }

    var fn;

    switch (this.loggers[handle].target) {
      case 'console':
      case 'stdout':
      case 'default':
      case 'main':
        console.log(msg);
        return true;
      default:
        msg = msg + "\n";
        break;
    }
    var fX = this.file.open(this.loggers[handle].target);
    this.file.append(fX, msg);
    this.file.close(fX);
    return true;
  };


  // routing
  this.connect_secure_router = function(myrouter) {
    this.routerS = myrouter;
    for (var i in this.ctrl) {
      if (typeof this.ctrl[i].socket_routes == 'function') {
        this.ctrl[i].socket_routes(myrouter);
      }
    }
  };

  this.connect_router = function(myrouter) {
    this.router = myrouter;
    for (var i in this.ctrl) {
      if (typeof this.ctrl[i].socket_routes == 'function') {
        this.ctrl[i].socket_routes(myrouter);
      }
    }
  };

  this.routes = function(router) {
    var i;
    this.routerControl = router;

    for (i in this.sing) {
      if (typeof this.sing[i].routes == 'function') {
        this.sing[i].routes(router);
      }
    }
    for (i in this.ctrl) {
      if (typeof this.ctrl[i].routes == 'function') {
        this.ctrl[i].routes(router);
      }
    }
  };

  /* We'll load our actual code from the 'eccentric' subdirectory! */
  this.tool = {
    'fs': fs,
  };
  this.models = {};
  this.tools = {};
  this.sing = {};

  this.loadTools = function() {
    var dn, d, i;

    dn = './lib/eccentric/';
    d = fs.readdirSync(dn);
    i = d.length;
    while (i > 0) {
      --i;
      var x = d[i].split('.');
      var dlname = x[0];
      if (x[x.length - 1] != 'js') continue;
      //console.log("Eccentric " + d[i]);
      this.models[dlname] = require('./eccentric/' + d[i]);
    }

    dn = './lib/singlets/';
    d = fs.readdirSync(dn);
    i = d.length;
    while (i > 0) {
      --i;
      if (typeof d[i] != 'string') continue;
      if (d[i].indexOf(".js") == -1) continue;
      if (d[i].indexOf("skeleton") != -1) continue;
      var x = d[i].split('.');
      var dlname = x[0];
      this.addSinglet(dlname);
    }

    var iTool, q, qobj, qload;
    for (i in this.models) {
      if (typeof this.models[i] != 'function') {
        console.log("File /eccentric/" + i + ".js is not a function."); //console.log("Static exposure", this.models[i]);
        continue;
      }
      iTool = i[0].toUpperCase() + i.slice(1);
      this.tools[iTool] = new this.models[i](this);
      if ('modlocaL' in this.tools[iTool]) {
        qobj = new this.tools[iTool].modlocaL(this);
        for (q in qobj) {
          eval("this." + q + " = qobj[q];")
        }
      }
      if( 'onLoad' in this.tools[iTool] ) {
        this.tools[iTool].onLoad(this);
      }
    }

    this.started = true;
    console.log("Tools loaded");
  };



  /* four letter words: hold the main pointers to cross functional boundaries. */
  this.ctrl = {};
  this.data = {};
  this.base = {};
  this.objs = {};

  this.fullworkcycle = [];
  this.fullworkn = 0;
  this.buildcycle = true;

  this.startup = function() {
    for (i in this.data) {
      if (typeof this.data[i].startup == 'function') {
        this.data[i].startup(this);
      }
    }
    for (i in this.objs) {
      if (typeof this.objs[i].startup == 'function') {
        this.objs[i].startup(this);
      }
    }
    for( i in this.tools) {
      if( typeof this.tools[i].startup == 'function') {
        this.tools[i].startup(this);
      }
    }
    console.log("app.startup complete");
  };

  this.singlet_store = [];

  this.finishSinglets = function() {
    var i, c;

    for( i in this.sing ) {
      c = this.sing[i];

      if (typeof c.Objs == 'function') {
        try {
          c.objs = new c.Objs();
        } catch (e) {
          c.objs = false;
          console.log("Mongoose initialization error");
          console.log(e);
        }
      }
    }
  }

  this.addSinglet = function(singname) {
    var A, fn, c;

    fn = "/singlets/" + singname + ".js";
    if (fs.existsSync("./lib" + fn)) {
      try {
        A = require("." + fn);
        c = new A(this);
      } catch (e) {
        console.log("Singlet ", singname);
        throw e;
      }
      c.app = this;
      c.base = false;
      c.objs = false;
      if (typeof c.Data == 'function') {
        try {
          c.base = new c.Data();
        } catch (e) {
          c.base = false;
          console.log("Database initialization error");
          console.log(e);
        }
      }

      this.sing[singname] = c;
      this.buildcycle = true;
    }
  };

  this.addModule = function(modname) {
    var A, fn;
    var b = 0,
      c = 0,
      d = 0,
      g = 0;

    if (this.started == false) {
      //this.packages.push(modname);
      return;
    }

    //console.log("Module " + modname);

    fn = "/control/" + modname + ".js";
    if (fs.existsSync("./lib" + fn)) {
      A = require("." + fn);
      c = new A();
      c.app = this;
      this.ctrl[modname] = c;
    } else {
      //console.log("No control for " + modname + ".");
    }
    fn = "/data/" + modname + ".js";
    if (fs.existsSync("./lib" + fn)) {
      A = require("." + fn);
      d = new A();
      d.app = this;
      this.data[modname] = d;
    }
    fn = "/base/" + modname + ".js";
    if (fs.existsSync("./lib" + fn)) {
      A = require("." + fn);
      b = new A(this);
      this.base[modname] = b;
    }
    fn = "/objs/" + modname + ".js";
    if (fs.existsSync("./lib" + fn)) {
      A = require("." + fn);
      g = new A(this);
      this.objs[modname] = g;
    }
    if (c != 0) {
      c.data = d;
      c.base = b;
      c.objs = g;
    }
    if (d != 0) {
      d.ctrl = c;
      d.base = b;
      d.objs = g;
    }
    if (b != 0) {
      b.ctrl = c;
      b.data = d;
      b.objs = g;
    }
    this.buildcycle = true;
  };

  this.startAppWorker = function(ap) {
    apps.push(ap);
    ap.appn = apps.length - 1;
  };

  this.workOut = function(ap, cb, rate) {
    var iTime = setInterval(cb, rate, ap.appn);
    //console.log("workOut @ " + rate + " = " + iTime);
    return iTime;
  };
  this.workNow = function(ap, cb) {
    return setImmediate(cb, ap.appn);
  };

  this.workCycle = function(appn) {
    apps[appn].workcycle();
  };
  this.fastCycle = function(appn) {
    apps[appn].fastcycle();
  };

};


function workCycle(i) {
  apps[i].workcycle();
}
