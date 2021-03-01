var type64 = require("int64-buffer");
var Int64Buffer = type64.Int64LE;
var Uint64Buffer = type64.Uint64LE;

var fs = require('fs');

function SznSys(app) {
  this.app = app;
  this.disabled = false;
  this.params = {};
  this.type_string = 0;
  this.type_float = 1;
  this.type_sint8 = 2;
  this.type_uint8 = 3;
  this.type_short = 3;
  this.type_sint16 = 4;
  this.type_uint16 = 5;
  this.type_sh = 5;
  this.type_sint32 = 6;
  this.type_uint32 = 7;
  this.type_long = 8;
  this.type_ln = 7;
  this.type_sint64 = 8;
  this.type_uint64 = 9;
  this.type_bufstring = 10;
  this.type_sizestring = 11;
  this.type_binstring = 98;
  this.type_primitives = 99;
  this.sizeType = Uint16Array; // memplus_sh
  this.sizeLen = 2;
  this.sizeLen2 = 8; // "sint32" that gluton uses
  this.classes_id = {};
  this.writers = {};
  this.loaders = {};
  this.builders = {};
  this.dubeg = false;
  this.shortTypes = {
    51: this.type_string,
    52: this.type_sizestring,
    // 53: short, 54: long

    55: this.type_float,
    56: this.type_uint16,

    57: this.type_sint16,

    58: this.type_uint32,

    59: this.type_sint32,

    60: this.type_uint64,

    61: this.type_sint64,

    62: this.type_double,

    63: this.type_sint8,
    64: this.type_uint8,

    // 65: void, 66: pointer

    67: this.type_uint8 // actually type_char but we don't bother with it
  };
  this.classes = {
    'string': this.type_string,
    'sizestring': this.type_sizestring,
    'float': this.type_float,
    'uint16': this.type_uint16,
    'sint16': this.type_sint16,
    'uint32': this.type_uint32,
    'sint32': this.type_sint32,
    'uint64': this.type_uint64,
    'sint64': this.type_sint64,
    'double': this.type_double,
    'sint8': this.type_sint8,
    'uint8': this.type_uint8
  };

  cc = this;
  this.modlocaL = function() {
    cc.app.szn = cc.app.tools.Szn;

    cc.app.charkey = function(c) {
      var a, code = c.toLowerCase().charCodeAt(0);

      if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
        a = 1 + (code - 'a'.charCodeAt(0));
      } else if ((c >= '0') && (c <= '9')) {
        a = 27 + (code - '0'.charCodeAt(0));
      } else {
        a = 38;
      }
      return a;
    };

    cc.app.namekey = function(str) {
      var key0 = 0;
      var i, len = str.length;
      if (len > 3) len = 3;

      for (i = 0; i < len; ++i) {
        key0 *= 36;
        key0 += cc.app.charkey(str[i]);
      }

      return key0;
    };
  };

  this.registerCastle = function() {
    this.loaders = {};
    this.writers = {};
    this.registerClass(this.classes['omap'], this.readOmap.bind(this), this.writeOmap.bind(this));
    this.registerClass(this.classes['tmap'], this.readTmap.bind(this), this.writeTmap.bind(this));
    this.registerClass(this.classes['dmap'], this.readDmap.bind(this), this.writeDmap.bind(this));
    this.registerClass(this.classes['smap'], this.readSmap.bind(this), this.writeSmap.bind(this));
    this.registerClass(this.classes['htable'], this.readTable.bind(this), this.writeTable.bind(this));
    this.registerClass(this.classes['tlist'], this.readList.bind(this), this.writeList.bind(this));
    console.log("Registered castle");
  };

  this.realTypeFor = function(short_type) {
    var i;
    for (i in this.shortTypes) {
      if (this.shortTypes[i] == short_type) {
        return i;
      }
    }
    console.log("Couldn't find real typeid for " + short_type);
    return null;
  };

  this.registerClass = function(vtype, loader, writer) {
    this.loaders[vtype] = loader;
    this.writers[vtype] = writer;
    //console.log("registered class " + vtype);
  };
  this.registerClassBuilder = function(vtype, builder) {
    this.builders[vtype] = builder;
  };

  this.typeIdByName = function(name) {
    return this.classes[name];
  };

  this.typeByName = function(name) {
    if (!(name in this.classes)) {
      //this.app.util.throwStack("Not found typename " + name);
      return null;
    }
    return this.classes_id[this.classes[name]];
  };
  this.typeById = function(id) {
    if( (id in this.shortTypes) )
      id = this.shortTypes[id];
    if( (id in this.classes_id) )
      return this.classes_id[id];
    return null;
  };


  this.writeList = function(listobj) {
    var buf, len = 0;
    var bufs = [],
      total_length = 0;

    var final_buffer = Array();
    final_buffer = final_buffer.concat.apply(final_buffer, bufs);
    return [final_buffer, total_length];
  };

  this.readList = function(buf, maxlen) {
    var obj = { count: 0, nodes: [] };
    var readlen;
    var count, sz, i;
    var idx = 0;

    var subtype;

    [subtype, readlen] = this.readVarBin(this.type_ln, buf, idx);
    idx += readlen;

    [count, readlen] = this.readVarBin(this.type_ln, buf, idx);
    idx += readlen;

    for( i = 0; i < count; ++i ) {
      [sz, readlen] = this.readVarBin( this.type_ln, buf, idx);
      idx += readlen;
      obj = this.readVarBin( subtype, buf, idx );
      if( idx > sz ) {
        console.log(idx + " > " + sz + " while reading list");
        this.app.util.throwStack("size mismatch");
        idx += sz;
        continue;
      }
      idx += readlen;
      obj.nodes.push( obj );
    }

    //console.log("Read list: ", obj);
    return [ obj, readlen ];
  };

  this.writeTable = function(obj) {
    var buf, len = 0,
      buf2, len2;
    var bufs = [],
      total_length = 0;
    var i, j, records, t;

    [buf, len] = this.writeVarBin(this.type_ln, obj.keymax);
    bufs.push(buf);
    total_length += len;

    for (i = 0; i < obj.keymax; ++i) {
      t = obj.tab[i];
      records = (typeof t.length == 'undefined') ? 0 : t.length;

      [buf, len] = this.writeVarBin(this.type_ln, records);
      bufs.push(buf);
      total_length += len;

      for (j = 0; j < records; ++j) {
        [buf, len] = this.writeVarBin(this.current_working_type, t[j]);
        [buf2, len2] = this.writeVarBin(this.type_ln, len);
        bufs.push(buf2);
        bufs.push(buf);
        total_length += (len + len2);
      }
    }

    var final_buffer = Array();
    final_buffer = final_buffer.concat.apply(final_buffer, bufs);
    return [final_buffer, total_length];
  };

  this.readTable = function(buf, maxlen) {
    var obj = {
      'keymax': 0,
      'tab': []
    };
    var i, j, records, tab;
    var readlen, val, idx = 0;

    [val, readlen] = this.readVarBin(this.type_ln, buf, idx);
    idx += readlen;
    obj.keymax = val;

    for (i = 0; i < obj.keymax; ++i) {
      [val, readlen] = this.readVarBin(this.type_ln, buf, idx);
      idx += readlen;

      if (val == 0) {
        obj.tab[i] = null;
        continue;
      }

      tab = [];
      records = val;
      for (j = 0; j < records; ++j) {

        [val, readlen] = this.readVarBin(this.type_ln, buf, idx);
        idx += readlen;
        if (val == 0)
          continue;

        [val, readlen] = this.readVarBin(this.current_working_type, buf, idx);
        idx += readlen;
        tab.push(val);
      }

      obj.tab[i] = tab;
    }

    return [obj, readlen];
  };

  this.writeOmap = function(obj) {
    var bufs = [],
      buf, len = 0,
      shlen, buf2, len2;
    var total_length = 0;

    [buf, len] = this.writeVarBin(this.type_ln, obj.keymax);
    bufs = bufs.concat(buf);
    total_length += len;

    for (i = 0; i < obj.keymax; ++i) {
      t = obj.tab[i];
      records = (t == null || typeof t.length == 'undefined') ? 0 : t.length;

      [buf, len] = this.writeVarBin(this.type_ln, records);
      bufs = bufs.concat(buf);
      total_length += len;

      for (j = 0; j < records; ++j) {
        //console.log("Write record " + j + ": ", t[j]);
        shlen = t[j].name.length;

        [buf, len] = this.writeVarBin(this.type_bufstring, t[j].name);
        //console.log("Len0: " + len + "(" + buf + ")");
        bufs = bufs.concat(buf);
        total_length += len;

        [buf1, len1] = this.writeVarBin(this.type_sint32, t[j].type);
        //console.log("Len1: " + len1 + "(" + buf1 + ")");
        [buf, len] = this.writeVarBin(t[j].type, t[j].obj);
        //console.log("Len2(" + t[j].type + "): " + len + "(" + buf + ")");
        //console.log(t[j].obj);
        //console.log(typeof t[j].obj);
        len = len1 + len;
        [buf2, len2] = this.writeVarBin(this.type_ln, len);
        //console.log("Len3: " + len2 + "(" + buf2 + ")");
        bufs = bufs.concat(buf2); // first length
        bufs = bufs.concat(buf1); // then type
        bufs = bufs.concat(buf); // then data
        total_length += len + len2; // (len includes len1 at this point)

      }
    }

    return [bufs, total_length];
  };

  this.readOmap = function(buf, maxlen) {
    var obj = {
      'keymax': 0,
      'tab': []
    };
    var i, j, records, tab;
    var readlen, val, idx = 0,
      subitem, datalen;

    [val, readlen] = this.readVarBin(this.type_ln, buf, idx);
    idx += readlen;
    obj.keymax = val;

    //console.log("Keymax: ", val);

    for (i = 0; i < obj.keymax; ++i) {
      //console.log("Read key " + i);
      [val, readlen] = this.readVarBin(this.type_ln, buf, idx);
      idx += readlen;

      if (val == 0) {
        obj.tab[i] = null;
        continue;
      }

      tab = [];
      records = val;
      //console.log(records + " records");
      for (j = 0; j < records; ++j) {
        //console.log(j + "/" + records);

        [val, readlen] = this.readVarBin(this.type_bufstring, buf, idx);
        idx += readlen;

        //val = this.bin2str(val);

        subitem = {
          'name': val,
          'type': 0,
          'obj': 0
        };


        [val, readlen] = this.readVarBin(this.type_ln, buf, idx);
        idx += readlen;
        datalen = val; // not used though, it's just there for special effects.
        //console.log("Head: " + val + ", Datalen: " + datalen);

        if( datalen != 0 ) {
          [val, readlen] = this.readVarBin(this.type_sint32, buf, idx);
          idx += readlen;
          subitem.type = val;

          [val, readlen] = this.readVarBin(subitem.type, buf, idx);
          idx += readlen;
          subitem.obj = val;
        } else {
          subitem.type = 0;
          subitem.obj = null;
        }

        console.log(subitem);

        tab.push(subitem);
      }

      obj.tab[i] = tab;
    }

    return [ obj, readlen ];
  };

  this.writeSmap = function(tblobj) {
    var buf, len = 0;
    var bufs = [],
      total_length = 0;

    var final_buffer = Array();
    final_buffer = final_buffer.concat.apply(final_buffer, bufs);
    return [final_buffer, total_length];
  };

  this.readSmap = function(buf, maxlen) {
    var listobj = [];

    return listobj;
  };

  this.writeTmap = function(tblobj) {
    var buf, len = 0;
    var bufs = [],
      total_length = 0;

    var final_buffer = Array();
    final_buffer = final_buffer.concat.apply(final_buffer, bufs);
    return [final_buffer, total_length];
  };

  this.readTmap = function(buf, maxlen) {
    var listobj = [];

    return [listobj,maxlen];
  };

  this.writeDmap = function(tblobj) {
    var buf, len = 0;
    var bufs = [],
      total_length = 0;

    var final_buffer = Array();
    final_buffer = final_buffer.concat.apply(final_buffer, bufs);
    return [final_buffer, total_length];
  };

  this.readDmap = function(buf, maxlen) {
    var listobj = [];

    return [listobj,maxlen];
  };


  this.nullObject = function(vtype, params) {
    var i, cl = this.typeById(vtype);
    if (cl === null) {
      console.log("Unknown type " + vtype);
      return {};
    }
    if (vtype in this.builders) {
      return new this.builders[vtype](params);
    }
    var objec = {};
    var n;
    for (i = 0; i < cl.vars.length; ++i) {
      n = cl.vars[i].name;
      if (params && n in params)
        objec[n] = params[n];
      else
        objec[n] = null;
    }
    return objec;
  };

  this.loadTypes = function() {
    // load stored types from szn definitions
    if( !fs.existsSync('/home/sendao/game/gserver/types.dat') ) {
      this.classes = {};
      this.classes_id = {};
      this.disabled = true;
      return false;
    }
    var buf = Buffer.from(fs.readFileSync('/home/sendao/game/gserver/types.dat'));
    var idx = 0,
      runlen = 0,
      varcount, n;
    this.app.logIf("szn", "File size: ", buf.length);

    var t_id, t_name, t_type, t_sizetype, t_objtype, t_size, t_offset, t_ptrlev, t_noszn, t_nostorage, t_parentclass;
    var cdef;

    var classCount = 0;

    do {
      [t_id, runlen] = this.readVarBin(this.type_sint32, buf, idx);
      idx += runlen;
      if (t_id == 0 && idx != runlen) {
        break;
      }

      [t_parentclass, runlen] = this.readVarBin(this.type_sint32, buf, idx);
      idx += runlen;

      [t_name, runlen] = this.readVarBin(this.type_string, buf, idx);
      idx += runlen;
      //console.log("Reading type '" + t_name + "'=" + t_id);

      [varcount, runlen] = this.readVarBin(this.type_uint8, buf, idx);
      idx += runlen;

      if( t_parentclass == 0 ) t_parentclass = -1;

      cdef = {
        'id': t_id,
        'name': t_name,
        'vars': [],
        'parentclass': t_parentclass
      };

      for (n = 0; n < varcount; n++) {
        [t_name, runlen] = this.readVarBin(this.type_string, buf, idx);
        idx += runlen;

        [t_type, runlen] = this.readVarBin(this.type_sint32, buf, idx);
        idx += runlen;

        [t_sizetype, runlen] = this.readVarBin(this.type_sint32, buf, idx);
        idx += runlen;

        [t_objtype, runlen] = this.readVarBin(this.type_sint32, buf, idx);
        idx += runlen;

        [t_size, runlen] = this.readVarBin(this.type_uint32, buf, idx);
        idx += runlen;

        [t_offset, runlen] = this.readVarBin(this.type_uint32, buf, idx);
        idx += runlen;


        [t_ptrlev, runlen] = this.readVarBin(this.type_uint16, buf, idx);
        idx += runlen;

        [t_noszn, runlen] = this.readVarBin(this.type_uint8, buf, idx);
        idx += runlen;

        [t_nostorage, runlen] = this.readVarBin(this.type_uint8, buf, idx);
        idx += runlen;

        cdef.vars.push({
          'name': t_name,
          'type': t_type,
          'sizetype': t_sizetype,
          'objtype': t_objtype,
          'size': t_size,
          'offset': t_offset,
          'ptrlev': t_ptrlev,
          'noszn': t_noszn,
          'nostorage': t_nostorage
        });
      }
      this.app.logIf("sznspam", "Read type: ", cdef);

      this.classes[cdef.name] = cdef.id;
      this.classes_id[cdef.id] = cdef;
      classCount++;
    } while (idx < buf.length);
    this.app.logIf("szn", "Read " + classCount + " classes.");
  };

  this.readBuffer = function(buf, maxlen) {
    var runlen = 0;

    // read type from buffer
    var typeid;

    if (typeof buf.buffer == 'undefined') {
      this.app.util.throwStack("transitioned to buffer")
      buf = Buffer.from(buf);
    }

    [typeid, runlen] = this.readVarBin(this.type_sint32, buf, runlen);

    var cdef = this.typeById(typeid);

    //console.log("Found type " + typeid);// + ": " + cdef.name);
    // offset string and read object from definition
    var subbuf = this.binslice( buf, runlen, buf.length-runlen );//buf.slice(runlen);
    var res = this.readObject(cdef, subbuf, maxlen - runlen);

    // return adjusted result
    return [res[0], runlen + res[1]];
  };

  this.writeBuffer = function(cdef, obj) {
    var buf, buf2, runlen, len;

    [buf, runlen] = this.writeObject(cdef, obj);
    [buf2, len] = this.writeVarBin(this.type_sint32, cdef.id);

    buf = buf2.concat(buf);
    runlen += len;

    return [buf, runlen];
  };

  this.testModeOf = function(cdef, obj) {
    var buf, len;

    [buf, len] = this.writeObject(cdef, obj);

    var newobj, newlen;

    [newobj, newlen] = this.readObject(cdef, buf, 0);
    if (newlen != len) {
      console.log("Write len for " + cdef.name + ": " + len + "; read length: " + newlen);
    }
    var i;
    for (i in newobj) {
      if (obj[i] != newobj[i]) {
        console.log("Test found Error mismatch " + i);
      }
    }
    return newobj;
  };

  this.readObject = function(cdef, buf, maxlen) {
    if( typeof maxlen == 'undefined' )
      maxlen = buf.length;

    if (typeof buf.buffer == 'undefined')
      buf = new Buffer(buf);

    //if( cdef.name != 'string' )
    //  console.log("Read object of " + cdef.name);
    var result = [];

    if( cdef.id in this.loaders ) {
      var g = this.loaders[cdef.id](buf,maxlen);
      if( typeof g != 'object' || g.length != 2 ) {
        console.log(g);
        this.app.util.throwStack("Invalid loader ");
        console.log(cdef);
        result = [g,maxlen];
      } else {
        result = g;
      }
    } else {
      result = this.readObjectTo(result, cdef, buf, maxlen);
    }

    return result;
  };

  this.readObjectTo = function(result, cdef, buf, maxlen) {
    var runlen = 0;
    var i, len;
    var v;

    if (cdef.parentclass != -1) {
      var tp = this.typeById(cdef.parentclass);
      var subbuf = this.binslice(buf, runlen, maxlen-runlen); // buf.slice(runlen, maxlen - runlen);
      [v,len] = this.readObjectTo( result, tp, subbuf, maxlen-runlen);
      runlen += len;
      result = v;
    }

    if (cdef.id in this.loaders) {
      [v, len] = this.loaders[cdef.id](buf, maxlen);
      runlen += len;
      result[cdef.vars[i].name] = v;
    } else {
      for (i = 0; i < cdef.vars.length; i++) {
        if (cdef.vars[i].noszn == 1) continue;
        // YO DON'T DELETE THE LOG LINES
        this.app.logIf("szn", "Read " + cdef.vars[i].name + "(" + cdef.vars[i].type + ")", buf);// + ": " + v);
        [v,len] = this.readVarBin(cdef.vars[i].type, buf, runlen);
        this.app.logIf("szn", "Value ", v);
        // THEY ARE REQUIRED FOR THE CODE TO WORK
        // I'M EFFIN SERIOUS JUST LEAVE THEM THERE
        // you think i'm joking... take them out again
        runlen += len;
        result[cdef.vars[i].name] = v;
      }
    }

    return [result, runlen];
  };

  this.readJSON = function(cdef, buf, expectSuccess=true) {
    var result = {};

    try {
      xbuf = this.app.util.parseJSON(buf);
    } catch( e ) {
      if( expectSuccess ) {
        console.log(cdef, "'" + buf + "'");
        this.app.util.throwStack("readJSON");
        return e;
      } else {
        return null;
      }
    }

    return this.readJSONTo(result, cdef, xbuf);
  };

  this.readJSONTo = function(result, cdef, buf) {

    var i, buf, bufs = "",
      len, total_length = 0;

    var vtype, subtype;

    for( i = 0; i < cdef.vars.length; i++ ) {
      vtype = cdef.vars[i].type;
      v = cdef.vars[i].name;

      if( !(v in buf) )
        continue;
      if (vtype in this.shortTypes) {
        result[v] = buf[v];
      } else if (vtype in this.classes_id) {
        result[v] = {};
        this.readJSONTo( result[v], this.classes_id[vtype], buf[v] );
      }
    }
    return result;
  };

  this.writeObject = function(cdef, obj) {
    var i, buf, bufs = [],
      len, total_length = 0;

    //console.log("Write " + cdef.name);
    if (cdef.parentclass != -1) {
      //console.log("Write also parent class " + cdef.parentclass);
      [buf, len] = this.writeObject(this.typeById(cdef.parentclass), obj);
      bufs = bufs.concat(buf);
      total_length += len;
    }
    if (cdef.id in this.writers) {
      [buf, len] = this.writers[cdef.id](obj);
      total_length = len;
      bufs = bufs.concat(buf);
    } else {
      for (i = 0; i < cdef.vars.length; i++) {
        if (cdef.vars[i].noszn == 1) continue;
        if( !(cdef.vars[i].name in obj) ) {
          this.app.util.throwStack("Missing parameter " + cdef.vars[i].name);
        }
        [buf, len] = this.writeVarBin(cdef.vars[i].type, obj[cdef.vars[i].name]);
        //console.log("Add " + cdef.vars[i].name + "(" + cdef.vars[i].type + ") buffer", buf, len);
        bufs = bufs.concat(buf);
        total_length += len;
      }
    }
    return [bufs, total_length];
  };

  this.writeJSON = function(cdef, obj) {
    var i, buf, bufs = "",
      len, total_length = 0;

    var vtype, subtype;

    if( cdef.parentclass != -1 ) {
      buf = this.writeJSON( this.typeById(cdef.parentclass), obj ) + ",";
    } else {
      buf = "";
    }

    bufs = "{" + buf;

    for( i = 0; i < cdef.vars.length; i++ ) {
      vtype = cdef.vars[i].type;
      val = obj[ cdef.vars[i].name ];

      if (vtype in this.shortTypes) {
        buf = this.app.util.printJSON( val );
        len = buf.length;
      } else if (vtype in this.classes_id) {
        [buf,len] = this.writeJSON( this.classes_id[vtype], val );
      } else {
        buf = "";
        len = 0;
      }
      if( len == 0 ) {
        this.app.util.throwStack("writeJSON failed to serialize a type");
        console.log(cdef);
        console.log(obj);
      } else {
        bufs = bufs + '"' + cdef.vars[i].name + '"' + buf + ",";
        total_length += len;
      }
    }
    return [bufs, bufs.length];
  };

  this.typed2buffer = function(ta) {
    var e = new Uint8Array( binbuf.buffer, binbuf.byteOffset, binbuf.byteLength - binbuf.byteOffset );
    return Buffer.from(e);
  };

  this.bin2simple = function(binbuf) {
    if (typeof binbuf.entries != 'function' || ( binbuf.BYTES_PER_ELEMENT != 1 ) ) {
      if( typeof binbuf != 'object' || typeof binbuf.buffer == 'undefined' ) {
        binbuf = Buffer.from(binbuf);
      } else if( typeof binbuf == 'object' && typeof binbuf.buffer != 'undefined' ) { // Found a TypedArray
        var e = new Uint8Array( binbuf.buffer, binbuf.byteOffset, binbuf.byteLength - binbuf.byteOffset );
        binbuf = Buffer.from( e );
      }
    }
    var i, e = binbuf.entries();
    var r = [];
    for (i of e) {
      r.push(i[1]);
    }
    return r;
  };

  this.bin2str = function(binbuf) {
    return Array.from(binbuf).map(x => String.fromCharCode(x)).join('');
  };

  this.str2bin = function(str) {
    //new Uint8Array
    return Buffer.from(str.split("").map(x => x.charCodeAt(0)));
  };

// buffer.slice only makes a reference, we need a copy:
  this.binslice = function(buf, stdex, len)
  {
    var b = Buffer.alloc(len);
    var origin = buf.byteOffset + stdex;
    if( len+origin > buf.length ) {
      this.app.util.throwStack("binslice(" + stdex + "," + len + "): failed (" + buf.length + " source length, " + buf.byteOffset + " offset)")
    }
    buf.copy( b, 0, origin, len+origin );
    return b;
  };

  this.IWantAString = function(val) {
    if (typeof val == 'string') {
      stringlen = val.length;
      vstr = this.str2bin(val); // new Uint8Array(val.split("").map(x=>x.charCodeAt(0)));
    } else if( typeof val == 'undefined' || val == null ) {
      val = '';
      stringlen = 0;
      vstr = this.str2bin(val); // new Uint8Array(val.split("").map(x=>x.charCodeAt(0)));
    } else {
      this.app.util.throwStack( "Value is not a string!" );
      try {
        val = this.app.util.printJSON( val );
      } catch( e ) {
        val = '';
      }
      stringlen = val.length;
      vstr = this.str2bin(val); // new Uint8Array(val.split("").map(x=>x.charCodeAt(0)));
    }
    return [vstr,val,stringlen];
  };

  this.writeVarBin = function(vtype, val) {
    var runlen, stringlen;
    var numbuf, resbuf, simbuf;
    var isnum = true,
      is_simple = false;

    if (vtype in this.shortTypes) {
      return this.writeVarBin(this.shortTypes[vtype], val);
    }

    if (vtype in this.classes_id) {
      return this.writeObject(this.classes_id[vtype], val);
    }

    switch (vtype) {
      case this.type_string: // this is probably slow as a snail. also I'm not sure this is really how we store strings. whatever.
        isnum = false;
        var vstr, vlen = new Int64Buffer(stringlen);
        if (typeof val == 'number')
          val = '' + val;
        [vstr,val,stringlen] = this.IWantAString( val );
        vlen = new Int64Buffer(stringlen);
        is_simple = true;
        simbuf = this.bin2simple(vlen).concat(this.bin2simple(vstr));
        //console.log("runlen: " + this.sizeLen2 + ", stringlen: " + stringlen);
        runlen = this.sizeLen2 + stringlen;
        break;
      case this.type_bufstring: // we're just using a different size type
        isnum = false;
        var vstr;//, vlen = new Int64Buffer(stringlen);
        if (typeof val == 'number')
          val = '' + val;
        [vstr,val,stringlen] = this.IWantAString( val );
        var vlen = this.sizeType.from([stringlen]);
        is_simple = true;
        //console.log("vlen: ", vlen, "vstr:", vstr);
        simbuf = this.bin2simple(vlen).concat(this.bin2simple(vstr));
        //console.log("runlen: " + this.sizeLen + ", stringlen: " + stringlen);
        runlen = this.sizeLen + stringlen;
        break;
      case this.type_binstring: // we're just using a different size type
        isnum = false;
        if (typeof val == 'number')
          val = '' + val;
        stringlen = val.length;
        var vstr;
        var vlen = new Int64Buffer(stringlen);
        if (typeof val == 'string') {
          vstr = this.str2bin(val); // new Uint8Array(val.split("").map(x=>x.charCodeAt(0)));
        } else {
          vstr = val;
        }
        is_simple = true;
        //console.log("vlen: ", vlen, "vstr:", vstr);
        simbuf = this.bin2simple(vlen).concat(this.bin2simple(vstr));
        //console.log("runlen: " + this.sizeLen + ", stringlen: " + stringlen);
        runlen = this.sizeLen2 + stringlen;
        break;
      case this.type_sizestring: // this should have a custom size type included in the variable which should be set globally and we'll read it later
        //! for now we'll use sint32
        isnum = false;
        if (typeof val == 'number')
          val = '' + val;
        stringlen = val.length;
        var vstr;
        var vlen = new Int64Buffer(stringlen);
        if (typeof val == 'string') {
          vstr = this.str2bin(val); // new Uint8Array(val.split("").map(x=>x.charCodeAt(0)));
        } else {
          vstr = val;
        }
        is_simple = true;
        simbuf = this.bin2simple(vlen).concat(this.bin2simple(vstr));
        //console.log("runlen: " + this.sizeLen2 + ", stringlen: " + stringlen);
        runlen = this.sizeLen2 + stringlen;
        break;
      case this.type_double:
        runlen = 8;
        numbuf = new Float64Array(1);
        break;
      case this.type_float:
        runlen = 4;
        numbuf = new Float32Array(1);
        break;
      case this.type_sint8:
        runlen = 1;
        numbuf = new Int8Array(1);
        break;
      case this.type_uint8:
        runlen = 1;
        numbuf = new Uint8Array(1);
        break;
      case this.type_sint16:
        runlen = 2;
        numbuf = new Int16Array(1);
        break;
      case this.type_uint16:
        runlen = 2;
        numbuf = new Uint16Array(1);
        break;
      case this.type_sint32:
        runlen = 8;
        numbuf = new Int32Array(1);
        break;
      case this.type_uint32:
        runlen = 4;
        numbuf = new Uint32Array(1);
        break;
      case this.type_sint64:
        runlen = 8;
        numbuf = new Int64Array(1);
        break;
      case this.type_uint64:
        runlen = 8;
        numbuf = new Uint64Buffer(1);
        break;
      default:
        this.app.util.throwStack("Invalid type " + vtype);
        return [null, 0];
    }

    if (isnum) {
      numbuf[0] = val;
      //resbuf = new Uint8Array(numbuf.buffer);
      simbuf = this.bin2simple(numbuf);//resbuf);
      is_simple = true;
    }

    if (!is_simple)
      simbuf = this.bin2simple(resbuf);

    while (simbuf.length < runlen) {
      simbuf.push(0);
    }

    return [simbuf, runlen];
  };

  this.readVarBin = function(vtype, buf, readptr) {
    var runlen = 0,
      stringlen = 0;
    var scanbuf, numbuf;
    var isnum = true,
      is64 = false;

    if (typeof readptr == 'undefined')
      readptr = 0;

    if (typeof buf.buffer == 'undefined' || typeof buf.copy == 'undefined') {
      this.app.util.throwStack("buf redefined");
      buf = Buffer.from(buf);
    }

    if (vtype in this.shortTypes) {
      vtype = this.shortTypes[vtype];
    }
    if( typeof vtype == 'string' && vtype in this.classes ) {
      vtype = this.classes[vtype];
    }
    if (vtype in this.classes_id) {
      var nbuf = this.binslice( buf, readptr, buf.length-readptr );
      var x = this.readObject(this.classes_id[vtype], nbuf);
      return x;
    }

    this.app.logIf( 'sznspam', "rvb(" + vtype + "," + buf.length + "," + readptr + ") = ");
    this.app.logIf( 'sznspam', buf.slice(readptr, readptr+16));


    switch (vtype) {
      case this.type_string:
        isnum = false;
        runlen = this.sizeLen2;

        scanbuf = this.binslice( buf, readptr, runlen );
        numbuf = new Uint64Buffer(scanbuf); //.buffer, scanbuf.byteOffset, 1 );
        stringlen = numbuf.toNumber();
        scanbuf = this.binslice( buf, readptr+runlen, stringlen );
        val = this.bin2str(scanbuf);
        runlen += stringlen;
        break;
      case this.type_bufstring:
        isnum = false;
        runlen = this.sizeLen;
        scanbuf = this.binslice( buf, readptr, runlen );
        numbuf = new this.sizeType(scanbuf.buffer, scanbuf.byteOffset, 1);
        stringlen = numbuf[0];
        //scanbuf = buf.slice(readptr + runlen, readptr + runlen + stringlen);
        scanbuf = this.binslice( buf, readptr + runlen, stringlen );
        val = this.bin2str(scanbuf);
        runlen += stringlen;
        break;
      case this.type_binstring:
        isnum = false;
        runlen = this.sizeLen2;
        scanbuf = this.binslice(buf, readptr, runlen);
        numbuf = new Uint64Buffer(scanbuf); //.buffer, scanbuf.byteOffset, 1 );
        stringlen = numbuf.toNumber();
        //scanbuf = buf.slice(readptr + runlen, readptr + runlen + stringlen);
        scanbuf = this.binslice(buf, readptr+runlen, stringlen);
        val = scanbuf;
        runlen += stringlen;
        break;
      case this.type_sizestring:
        isnum = false;
        runlen = this.sizeLen2;
        scanbuf = this.binslice( buf, readptr, runlen );
        numbuf = new Uint64Buffer(scanbuf);
        stringlen = numbuf.toNumber();
        scanbuf = this.binslice( buf, readptr+runlen, stringlen );
        //scanbuf = buf.slice(readptr + runlen, readptr + runlen + stringlen);
        val = scanbuf;
        runlen += stringlen;
        break;
      case this.type_double:
        runlen = 8;
        scanbuf = this.binslice( buf, readptr, runlen );
        //scanbuf = buf.slice(readptr, readptr + runlen);
        //float64 is special and requires a byteoffset mod 4
        //so we make a new buffer from the slice.
        //var newbuf = Buffer.from( scanbuf.buffer, scanbuf.byteOffset, runlen);
        // ... now we can render the buffer from that:
        //console.log("Newbuf offset: " + newbuf.byteOffset);
        numbuf = new Float64Array(scanbuf.buffer, scanbuf.byteOffset, 1);
        break;
      case this.type_float:
        runlen = 4;
        scanbuf = this.binslice( buf, readptr, runlen );
        //scanbuf = buf.slice(readptr, readptr + runlen);
        //float64 is special and requires a byteoffset mod 4
        //so we make a new buffer from the slice.
        //var newbuf = Buffer.from( scanbuf ); // scanbuf.buffer, scanbuf.byteOffset, runlen);
        // ... now we can render the buffer from that:
        //console.log("Newbuf offset: " + newbuf.byteOffset);
        numbuf = new Float32Array(scanbuf.buffer, scanbuf.byteOffset, 1);
        break;
      case this.type_sint8:
        runlen = 1;
        scanbuf = this.binslice( buf, readptr, runlen );
        numbuf = new Int8Array(scanbuf.buffer, scanbuf.byteOffset, 1);
        break;
      case this.type_uint8:
        runlen = 1;
        scanbuf = this.binslice( buf, readptr, runlen );
        numbuf = new Uint8Array(scanbuf.buffer, scanbuf.byteOffset, 1);
        break;
      case this.type_sint16:
        runlen = 2;
        scanbuf = this.binslice( buf, readptr, runlen );
        numbuf = new Int16Array(scanbuf.buffer, scanbuf.byteOffset, 1);
        break;
      case this.type_uint16:
        runlen = 2;
        scanbuf = this.binslice( buf, readptr, runlen );
        numbuf = new Uint16Array(scanbuf.buffer, scanbuf.byteOffset, 1);
        break;
      case this.type_sint32:
        /* This part of SZN is wrong */
        // runlen = 4;
        // numbuf = new Int32Array( scanbuf.buffer );

        runlen = 8;
        scanbuf = this.binslice( buf, readptr, runlen );
        //console.log("Scan buffer for int32: ", scanbuf);
         // Buffer.from( buf, readptr, runlen ); // buf.slice(readptr, readptr+runlen);
        numbuf = new Int64Buffer(scanbuf);
        if (this.dubeg) {
          //console.log("scan:", scanbuf);
        }
        //console.log("Number: " + numbuf.toNumber());
        is64 = true;
        break;
      case this.type_uint32:
        runlen = 4;
        scanbuf = this.binslice( buf, readptr, runlen );
        //scanbuf = buf.slice(readptr, readptr + runlen);
        numbuf = new Uint32Array(scanbuf, 0, 1); //, scanbuf.byteOffset, 1 );//.buffer );
        if (this.dubeg) {
          //console.log("u32:", numbuf);
          //console.log("result: " + numbuf[0]);
        }
        break;
      case this.type_sint64:
        runlen = 8;
        scanbuf = this.binslice( buf, readptr, runlen );
        //scanbuf = buf.slice(readptr, readptr + runlen);
        numbuf = new Int64Buffer(scanbuf.buffer, scanbuf.byteOffset, 1);
        is64 = true;
        break;
      case this.type_uint64:
        runlen = 8;
        scanbuf = this.binslice( buf, readptr, runlen );
        //scanbuf = buf.slice(readptr, readptr + runlen);
        numbuf = new Uint64Array(scanbuf.buffer, scanbuf.byteOffset, 1);
        is64 = true;
        break;
      default:
        console.log("Unknown type " + vtype);
        return [null, 0];
    }

    if (isnum) {
      if (is64) {
        val = numbuf.toNumber();
      } else {
        val = numbuf[0];
      }
    }
    //console.log("readVarBin: ", scanbuf)
    //if( this.dubeg )
    //    		console.log("rvb = " + val);
    return [val, runlen];
  };
};

module.exports = SznSys;
