var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');
var decompress = require('decompress');
var AdmZip = require('adm-zip');

module.exports = function PlayControl() {

  this.routes = function(router) {
    router.get('/plex/user').bind(this.getUserdata.bind(this));
    router.get('/plex/res').bind(this.getResource.bind(this));
    router.get('/plex/mres').bind(this.getMapResource.bind(this));
    router.get('/plex/img').bind(this.getImgResource.bind(this));
    router.get('/plex/mapobj').bind(this.getMapdata.bind(this));
    router.get('/plex/objdat').bind(this.getObjdata.bind(this));
    router.get(/^\/plex\/obj\/(.+).zip$/).bind(this.getObjzip.bind(this));
    router.get('/plex/compile').bind(this.getCompiledScript.bind(this));

    router.post('/plex/sat').bind(this.setSatellites.bind(this));
    router.post('/plex/object').bind(this.setObject.bind(this));
    router.post('/plex/map').bind(this.setMap.bind(this));
    router.post('/plex/delobj').bind(this.delObject.bind(this));
    router.post('/plex/delmap').bind(this.delMap.bind(this));
    router.post('/plex/mapobjs').bind(this.setMapobjs.bind(this));
    router.post('/plex/cat').bind(this.setCategory.bind(this));
    router.post('/plex/delcat').bind(this.delCategory.bind(this));
    router.post('/plex/importimg').bind(this.importImage.bind(this));
    router.post('/plex/importmap').bind(this.importMap.bind(this));
    router.post('/plex/importobj').bind(this.importObj.bind(this));
    router.post('/plex/objdata').bind(this.setObjdata.bind(this));
    router.post('/plex/objcoll').bind(this.importCollider.bind(this));
    router.post('/plex/objbreak').bind(this.importBreakable.bind(this));
    router.post('/plex/script').bind(this.setScript.bind(this));
    router.post('/plex/delscript').bind(this.delScript.bind(this));
    router.post('/plex/scriptevent').bind(this.setScriptEvent.bind(this));
    router.post('/plex/delscriptevent').bind(this.delScriptEvent.bind(this));
  };

  this.getCompiledScript = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      var id = params['id'];
      var data = { 'objs': [] };
      this.objs.Mapobjects.find({mapid: id}, function(e, docs) {
        if( e ) {
          console.log("Error", e);
          res.send( 404, res['headers'], 'File not found.' );
          return;
        }
        var i,j,obj;
        var objs={};
        var objects={};
        var objdats = {};
        var objids = [];
        var scriptdats = {};
        var scriptids = [];

        for( i=0;i<docs.length;++i ) {
          obj = docs[i].toObject();
          if( obj.scriptid != '' ) {
            if( !(obj.scriptid in scriptdats) ) {
              scriptdats[obj.scriptid]=true;
              scriptids.push(obj.scriptid);
            }
          }
          objs[obj._id] = obj;
          if( obj.objid in objdats ) {
            objdats[obj.objid].push(obj._id);
          } else {
            objids.push(obj.objid);
            objdats[obj.objid] = [obj._id];
          }
        }

        this.objs.Objects.find({_id: { '$in': objids }}, function(e, docs) {
          var i,j,k,obj;

          for( i=0;i<docs.length;++i ) {
            obj = docs[i].toObject();
            objects[ obj._id ] = obj;
            if( obj.scriptid != '' ) {
              if( !(obj.scriptid in scriptdats) ) {
                scriptdats[obj.scriptid]=true;
                scriptids.push(obj.scriptid);
              }
            }
          }
          this.objs.Scripts.find({_id: { '$in': scriptids }}, function(e, docs) {
            var i,k,scripts={},obj;

            for( i=0;i<docs.length;++i ) {
              obj = docs[i].toObject();
              if( obj.events != '' )
                obj.events = JSON.parse(obj.events);
              else
                obj.events = {};

              scripts[obj._id] = obj;
            }

            var scr = '', scrbuf='';

            scrbuf = "var _scripts={}, moscripts={};\n";
            scr += scrbuf;
            for( i in scripts ) {
              scrbuf = "_scripts['" + i + "'] = function(_game){\n";
              scrbuf += "var game = _game;\n";
              if( 'init' in scripts[i].events ) {
                scrbuf += scripts[i].events['init'] + "\n";
              }
              for( k in scripts[i].events ) {
                if( k == 'init' ) continue;
                var args;
                switch(k) {
                  case 'idle':
                    args = "elapsed";
                    break;
                  case 'onload':
                    args = "obj";
                    break;
                  default:
                    args = "obj, objno";
                    break;
                }
                scrbuf += "  this." + k + " = function(" + args + "){\n";
                scrbuf += scripts[i].events[k] + "\n";
                scrbuf += "  };\n";
              }
              scrbuf += "};\n";
              scr += scrbuf;
            }

            for( i in objs ) {
              if( objs[i].scriptid.length == 0 ) {
                if( !(objs[i].objid in objects) ) {
                  console.log("Not found objid " + objs[i].objid);
                  continue;
                }
                if( objects[objs[i].objid].scriptid.length == 0 ) {
                } else {
                  scr += "moscripts['" + objs[i]._id + "'] = _scripts['" + objects[objs[i].objid].scriptid + "'];\n";
                }
                continue;
              }
              scrbuf = "moscripts['" + objs[i]._id + "'] = _scripts['" + objs[i].scriptid + "'];\n";
              scr += scrbuf;
            }
            //Todo: Max-age header
            this.app.respond.header(res, 'Content-Type', 'text/javascript');
            res.send(200, res.headers, scr);
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  this.getUserdata = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.data.registerPlayer( auth.userid, auth.pagekey, function() {
        this.objs.Players.find({userid: auth.userid}, function(e,docs) {
          var data = { objects: [], maps: [], cats: [], scripts: [] };

          this.objs.Objects.find({})
          .select({ id: 1, name: 1, tags: 1, catid: 1, scriptid: 1 })
          .exec(function(e,docs) {
            var i, obj;

            for( i=0; i<docs.length; ++i ) {
              obj = docs[i].toObject();
              delete obj['data'];
              data.objects.push( obj );
            }

            this.objs.Objcats.find({}, function(e,docs) {
              var i, obj;

              for( i=0; i<docs.length; ++i ) {
                obj = docs[i].toObject();
                data.cats.push(obj);
              }

              this.objs.Maps.find({}, function(e,docs) {
                var i, obj, count=docs.length;

                if( count == 0 ) {
                  this.objs.Scripts.find({}, function(e,docs) {
                    var i, obj;

                    for( i=0;i<docs.length; ++i ) {
                      obj = docs[i].toObject();
                      if( obj.events != '' )
                        obj.events = JSON.parse(obj.events);
                      else
                        obj.events = {};
                      data['scripts'].push(obj);
                    }

                    this.app.respond.jsonOk(res, data);
                  }.bind(this));
                  return;
                }

                for( i=0; i<docs.length; ++i ) {
                  obj = docs[i].toObject();
                  obj.sats = [];
                  data.maps.push( obj );

                  this.objs.Mapsats.find({mapid:obj._id}, function(obj,e,docs) {
                    var i, o;

                    for( i=0; i<docs.length; ++i ) {
                      o = docs[i].toObject();
                      obj.sats.push(o);
                    }

                    count--;
                    if( count == 0 ) {
                      this.objs.Scripts.find({}, function(e,docs) {
                        var i, obj;

                        for( i=0;i<docs.length; ++i ) {
                          obj = docs[i].toObject();
                          if( obj.events != '' )
                            obj.events = JSON.parse(obj.events);
                          else
                            obj.events = {};
                          data['scripts'].push(obj);
                        }

                        this.app.respond.jsonOk(res, data);
                      }.bind(this));
                    }
                  }.bind(this,obj));
                }
              }.bind(this));
            }.bind(this));
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  this.getMapdata = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      var id = params['id'];
      var data = { 'objects': [], 'sats': [] };
      this.objs.Mapsats.find({mapid: id}, function(e, docs) {
        if( e ) {
          console.log("Error getting map: ", e);
          this.app.respond.jsonStatus(res, 'error', "NoSQL Error" );
          return;
        }
        var i, sat;

        for( i=0; i<docs.length; ++i ) {
          sat = docs[i].toObject();
          data.sats.push(sat);
        }

        this.objs.Mapobjects.find({mapid: id}, function(e, docs) {
          if( e ) {
            console.log("Error getting map: ", e);
            this.app.respond.jsonStatus(res, 'error', "NoSQL Error" );
            return;
          }
          var i, obj;

          for( i=0; i<docs.length; ++i ) {
            obj = docs[i].toObject();
            data.objects.push(obj);
          }
          this.app.respond.jsonOk(res, data);
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  this.getObjdata = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      var id = params['id'];
      var data = { 'objs': [] };
      this.objs.Objdata.find({objid: id}, function(e, docs) {
        var i, obj;

        if( docs == null || typeof docs == 'undefined' ) {
          this.app.respond.jsonOk(res, data);
          return;
        }

        for( i=0; i<docs.length; ++i ) {
          obj = docs[i].toObject();
          data.objs.push(obj);
        }

        this.app.respond.jsonOk(res, data);
      }.bind(this));
    }.bind(this));
  };

  this.fileResponse = function(req, res, path) {
    var n = path.lastIndexOf(".");
    var ext = path.substr(n+1);
    var fmt = this.app.app_static.formats[ext];
    if( !(ext in this.app.app_static.formats) ) fmt = '';
    if( typeof fmt == 'string' ) {
      this.app.respond.header(res, 'Content-Type', fmt);
    } else {
      this.app.respond.header(res, 'Content-Type', fmt['ansi']);
    }

    if( fs.existsSync(path) ) {
      fs.stat( path, function(err, fstat) {
        var modtime = new Date( fstat['mtime'] );
        this.app.respond.header(res, "Cache-Control", "max-age=31536000");
        this.app.respond.header(res, "Last-Modified", modtime.toUTCString());
        if( 'if-modified-since' in req.headers ) {
          var modsince = new Date(req.headers['if-modified-since']);
          if( modsince.getTime()+1000 >= modtime.getTime() ) {
            res.send( 304, res['headers'], '' );
            return;
          }
        }
        fdata = fs.readFileSync(path);
        res.send( 200, res['headers'], fdata.toString('binary') );
      }.bind(this));
    } else {
      res.send( 404, res['headers'], 'File not found.' );
    }
    return;
  };

  this.getObjzip = function(req, res, id, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      console.log("getObjzip(" + id + ")");
      if( id.indexOf("..") != -1 ) {
        this.app.respond.header(res, 'Content-Type', 'text/html');
        res.send( 404, res['headers'], '' );
        return;
      }

      this.objs.Objects.find({'_id': id}, function(e, docs) {
        if( e || docs.length == 0 ) {
          this.app.respond.header(res, 'Content-Type', 'text/html');
          res.send( 404, res['headers'], '' );
          return;
        }
        var zip = new AdmZip(), obj = docs[0].toObject();

        if( fs.existsSync('/objs/' + id + '/')) {
          zip.addLocalFolder("/objs/" + id + "/");
        }

        if( obj.data.length() > 0 ) {
          console.log("Add basis ", typeof obj.data, "Length: " + obj.data.length());
          var str = obj.data.toString('binary');
          zip.addFile("basis.gltf", Buffer.alloc(str.length,str));
        }

        var tosend = zip.toBuffer();
        this.app.respond.header(res, 'Content-Type', 'application/zip');
        res.send( 200, res['headers'], tosend.toString('binary') );
      }.bind(this));
    }.bind(this));
  };

  this.getResource = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      if( params['id'].indexOf("..") != -1 ) {
        this.app.respond.header(res, 'Content-Type', 'text/html');
        res.send( 404, res['headers'], '' );
        return;
      }
      var ids = params['id'].split('/');
      var id = ids[0];
      var path, prepath;
      if( ids[1] == 'coll' ) {
        if( ids[2] == 'basis' ) {
          path = this.data.findBasis(id,true);
          if( path === false ) {
            this.app.respond.header(res, 'Content-Type', 'text/html');
            res.send( 404, res['headers'], '' );
            return;
          }
          prepath = '/objs/' + id + '/coll/';
          this.fileResponse(req, res, prepath + path);
          return;
        }
        path = ids.join('/');
        prepath = '/objs/';
        this.fileResponse(req, res, prepath + path);
        return;
      }
      if( ids[1] == 'sml' || ids[1] == 'med' ) {
        if( ids[2] == 'basis' ) {
          var subpath = this.data.findBasis2('/objs/' + id + '/' + ids[1] + '/');
          if( !subpath ) {
            this.app.respond.header(res, 'Content-Type', 'text/html');
            res.send( 404, res['headers'], '' );
            return;
          }
          path = '/objs/' + id + '/' + ids[1] + '/' + subpath;
        } else {
          path = '/objs/' + ids.join('/');
        }
        this.fileResponse(req, res, path);
        return;
      }
      if( ids[1] == 'basis' ) {
        this.objs.Objects.find({'_id': id}, function(e, docs) {
          if( e ) {
            console.log("Error finding object: ", e);
            this.app.respond.jsonStatus(res, 'error', 'NoSQL Error');
            return;
          }
          if( docs == null || docs.length <= 0 ) {
            this.app.respond.jsonStatus(res, 'error', "Couldn't find object");
            return;
          }
          var obj = docs[0].toObject();
          if( obj.data.length() > 0 ) {
            this.app.respond.header(res, 'Content-Type', 'application/json');
            res.send( 200, res['headers'], obj.data.toString('binary'));
            return;
          }
          path = this.data.findBasis(id);
          if( !path ) {
            this.app.respond.header(res, 'Content-Type', 'text/html');
            res.send( 404, res['headers'], '' );
            return;
          }
          prepath = '/objs/' + id + '/';
          this.fileResponse(req, res, prepath + path);
        }.bind(this));
      } else {
        path = ids.join('/');
        prepath = '/objs/';
        if( path.indexOf("..") != -1 ) {
          this.app.respond.header(res, 'Content-Type', 'text/html');
          res.send( 404, res['headers'], '' );
          return;
        }
        this.fileResponse(req, res, prepath + path);
      }
    }.bind(this));
  };
  this.getImgResource = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      var imgid = params['id'];
      var path = '/imgs/' + imgid + '.png';
      this.fileResponse(req,res,path);
    }.bind(this));
  };

  this.getMapResource = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      var ids = params['id'].split('/');
      var id = ids[0];
      ids.splice(0,1);
      var path = ids.join('/');
      if( path.indexOf("..") != -1 ) {
        this.app.respond.header(res, 'Content-Type', 'text/html');
        res.send( 404, res['headers'], '' );
        return;
      }
      var n = path.lastIndexOf(".");
      var ext = path.substr(n+1);
      var fmt = this.app.app_static.formats[ext];
      if( !(ext in this.app.app_static.formats) ) fmt = '';
      if( typeof fmt == 'string' ) {
        this.app.respond.header(res, 'Content-Type', fmt);
      } else {
        this.app.respond.header(res, 'Content-Type', fmt['ansi']);
      }
      console.log("Path: " + path + ", Format: ", fmt);
      var prepath = '/maps/' + id + '/';
      if( fs.existsSync(prepath + path) ) {
        fdata = fs.readFileSync(prepath + path);
        res.send( 200, res['headers'], fdata.toString('binary') );
      } else {
        res.send( 404, res['headers'], 'File not found.' );
      }
    }.bind(this));
  };

  this.setObjdata = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var i, path, objno, objid;
        var objs = [], updates = [];
        var mapid = '';
        var firstRun = true;

        for( i in params ) {
          if( i == 'first' ) {
            firstRun = params[i] == 't' ? true:false;
            continue;
          }
          path = i.split(".");
          objno = path[1];
          if( !(objno in objs) ) objs.push({});
          objs[objno][path[2]] = params[i];
        }

        for( i=0; i<objs.length; ++i ) {
          if( i == 0 ) objid = objs[i].objid;
          if( objs[i].deleted == '1' ) {
            continue;
          } else if( objs[i]._id == '' ) {
            objs[i]._id = new ObjectID();
            //console.log("Objects[i] = ", objs[i]);
            updates.push({insertOne: {
              document: objs[i]
            }});
          } else {
            updates.push({insertOne: {
              document: objs[i]
            }});
          }
        }

        if( firstRun ) {
          this.objs.Objdata.deleteMany({objid: objid}, function(e,upd) {
            console.log("Deleted entries", e, upd);
            this.objs.Objdata.bulkWrite(updates, function(e,updata) {
              if( e ) {
                console.log("Updates", updates);
                console.log("Error updating objdata: ", e);
                this.app.respond.jsonStatus(res, 'error', 'NoSQL Error');
              } else {
                var i;
                var data = { 'objs': [] };

                for( i=0; i<objs.length; ++i ) {
                  if( objs[i].deleted == '1' ) continue;
                  data.objs.push(objs[i]._id);
                }
                this.app.respond.jsonOk(res, data);
              }
            }.bind(this));
          }.bind(this));
        } else {
          this.objs.Objdata.bulkWrite(updates, function(e,updata) {
            if( e ) {
              console.log("Updates", updates);
              console.log("Error updating objdata: ", e);
              this.app.respond.jsonStatus(res, 'error', 'NoSQL Error');
            } else {
              var i;
              var data = { 'objs': [] };

              for( i=0; i<objs.length; ++i ) {
                if( objs[i].deleted == '1' ) continue;
                data.objs.push(objs[i]._id);
              }
              this.app.respond.jsonOk(res, data);
            }
          }.bind(this));
        }
      }.bind(this));
    }.bind(this));
  };


  this.setSatellites = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var i, path, objno;
        var objs = [], updates = [];
        var mapid = '';

        for( i in params ) {
          path = i.split(".");
          objno = path[1];
          if( !(objno in objs) ) objs.push({});
          objs[objno][path[2]] = params[i];
        }

        //console.log("setSatellites: ", objs);

        for( i=0; i<objs.length; ++i ) {
          if( objs[i].mapid != '' ) {
            mapid = objs[i].mapid;
          }
          if( objs[i].deleted == '1' ) {
            if( objs[i]._id != '' ) {
              updates.push({deleteOne: {
                filter: { _id: objs[i]._id }
              }});
            }
          } else if( objs[i]._id == '' ) {
            objs[i]._id = new ObjectID();
            updates.push({insertOne: {
              document: objs[i]
            }});
          } else {
            updates.push({updateOne: {
              filter: { _id: objs[i]._id },
              update: objs[i]
            }});
          }
        }

        this.objs.Mapsats.bulkWrite(updates, function(e,updata) {
          if( e ) {
            console.log("Error updating satellites: ", e);
            this.app.respond.jsonStatus(res, 'error', 'NoSQL Error');
          } else {
            var i;
            var data = { 'sats': [], 'mapid': mapid };

            for( i=0; i<objs.length; ++i ) {
              if( objs[i].deleted == '1' ) continue;
              data.sats.push(objs[i]._id);
            }
            this.app.respond.jsonOk(res, data);
          }
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  this.setMapobjs = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var i, path, objno;
        var objs = {}, updates = [];
        var objids = {};

        for( i in params ) {
          if( i == 'first' ) continue;
          path = i.split(".");
          objno = path[1];
          if( !(objno in objs) ) objs[objno] = {};
          objs[objno][path[2]] = params[i];
        }


        for( i in objs ) {
          if( objs[i].deleted == '1' ) {
            if( objs[i]._id != '' ) {
              updates.push({deleteOne: {
                filter: { _id: objs[i]._id }
              }});
            }
          } else if( objs[i]._id == '' ) {
            objs[i]._id = new ObjectID();
            objids[ objs[i]._id ] = objs[i].tempid;
            delete objs[i].tempid;
            updates.push({insertOne: {
              document: objs[i]
            }});
          } else {
            if( 'tempid' in objs[i] )
              delete objs[i].tempid;
            updates.push({updateOne: {
              filter: { _id: objs[i]._id },
              update: { $set: objs[i] }
            }});
          }
        }

        this.objs.Mapobjects.bulkWrite(updates, function(e,updata) {
          if( e ) {
            console.log(objs);
            console.log(updates);
            console.log("Error updating objs: ", e);
            this.app.respond.jsonStatus(res, 'error', 'NoSQL Error');
          } else {
            this.app.respond.jsonOk(res, objids);
          }
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };
  this.uploadEnvmap = function(mapid, envmapdata) {
    if( !fs.existsSync('/maps/' + mapid) ) {
      fs.mkdirSync('/maps/' + mapid);
    }
    var envf = fs.openSync('/maps/' + mapid + '/envmap.dds', 'w');
    fs.writeSync(envf, envmapdata);
    fs.closeSync(envf);
    return "/maps/" + mapid + "/envmap.dds";
  };
  this.uploadSkydome = function(mapid, fn, envmapdata) {
    if( !fs.existsSync('/maps/' + mapid) ) {
      fs.mkdirSync('/maps/' + mapid);
    }
    var fsn = fn.split('.');
    var ext = fsn[fsn.length-1];
    var envf = fs.openSync('/maps/' + mapid + '/skydome.' + ext, 'w');
    fs.writeSync(envf, envmapdata);
    fs.closeSync(envf);
    return "/maps/" + mapid + "/skydome." + ext;
  };

  this.importUnzip = function(mapid, zipdata, cb) {
    var zipf = fs.openSync('/tmp/map_' + mapid + '.zip', 'w');
    var basisdata = '';
    fs.writeSync(zipf, zipdata);
    fs.closeSync(zipf);

    fs.mkdir('/maps/' + mapid, function() {
      decompress('/tmp/map_' + mapid + '.zip', '/maps/' + mapid).then( function(files) {
        var i, count=files.length;
        for( i=0; i<files.length; ++i ) {
          var n = files[i].path.lastIndexOf(".");
          var ext = files[i].path.substr(n+1);
          if( ext == 'gltf' || ext == 'glb' ) {
            console.log("Found gltf file: " + files[i].path);
            basisdata = files[i].path;
            console.log("gltf length: " + basisdata.length);
            break;
          }
        }
        cb(basisdata);
      }.bind(this));
    }.bind(this));
  };

  this.uploadBreak = function(objid, zipdata, cb) {
    var zipf = fs.openSync('/tmp/obj_' + objid + '_break.zip', 'w');
    var basisdata = '';
    fs.writeSync(zipf, zipdata);
    fs.closeSync(zipf);

    fs.rmdirSync('/objs/' + objid + '/break', { recursive: true });

    fs.mkdir('/objs/' + objid + '/break', function() {
      decompress('/tmp/obj_' + objid + '_break.zip', '/objs/' + objid + '/break').then( function(files) {
        console.log("Done uploading zipfile");
        fs.unlink('/tmp/obj_' + objid + '_break.zip', function(err) {
          var i, count=files.length;
          for( i=0; i<files.length; ++i ) {
            var n = files[i].path.lastIndexOf(".");
            var ext = files[i].path.substr(n+1);
            if( ext == 'gltf' || ext == 'glb' ) {
              console.log("Found gltf file");
              //basisdata = files[i].data;
              console.log("gltf length: " + basisdata.length);
              break;
            }
          }
          cb(basisdata);
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  this.uploadColl = function(objid, zipdata, cb) {
    var zipf = fs.openSync('/tmp/obj_' + objid + '_coll.zip', 'w');
    var basisdata = '';
    fs.writeSync(zipf, zipdata);
    fs.closeSync(zipf);

    fs.rmdirSync('/objs/' + objid + '/coll', { recursive: true });

    fs.mkdir('/objs/' + objid + '/coll', function() {
      decompress('/tmp/obj_' + objid + '_coll.zip', '/objs/' + objid + '/coll').then( function(files) {
        console.log("Done uploading zipfile");
        fs.unlink('/tmp/obj_' + objid + '_coll.zip', function(err) {
          var i, count=files.length;
          for( i=0; i<files.length; ++i ) {
            var n = files[i].path.lastIndexOf(".");
            var ext = files[i].path.substr(n+1);
            if( ext == 'gltf' || ext == 'glb' ) {
              console.log("Found gltf file");
              //basisdata = files[i].data;
              console.log("gltf length: " + basisdata.length);
              break;
            }
          }
          cb(basisdata);
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  this.uploadImage = function(imgid, data) {
    var f = fs.openSync('/imgs/' + imgid + '.png', 'w');
    fs.writeSync(f, data);
    fs.closeSync(f);
  };

  this.importImage = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var fdata = req.files['data'][1];
        var imgid = params['id'];

        this.uploadImage(imgid, fdata);
        this.app.respond.jsonOk(res, {});
      }.bind(this));
    }.bind(this));
  };

  this.uploadZip = function(objid, zipdata, cb) {
    var zipf = fs.openSync('/tmp/obj_' + objid + '.zip', 'w');
    var basisdata = '';
    fs.writeSync(zipf, zipdata);
    fs.closeSync(zipf);

    fs.mkdir('/objs/' + objid, function() {
      decompress('/tmp/obj_' + objid + '.zip', '/objs/' + objid).then( function(files) {
        console.log("Done uploading zipfile");
        fs.unlink('/tmp/obj_' + objid + '.zip', function(err) {
          var i, count=files.length;
          for( i=0; i<files.length; ++i ) {
            var n = files[i].path.lastIndexOf(".");
            var ext = files[i].path.substr(n+1);
            if( ext == 'gltf' || ext == 'glb' ) {
              console.log("Found gltf file");
              //basisdata = files[i].data;
              console.log("gltf length: " + basisdata.length);
              break;
            }
          }
          cb(basisdata);
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  this.importMap = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var fdata = req.files['data'][1];
        var mapid = params['mapid'];

        this.importUnzip(mapid, fdata, function(gltf_path) {
          this.app.respond.jsonOk(res, {'path': gltf_path});
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  this.importObj = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var fdata = req.files['gltf'][1];
        var mapid = params['mapid'];

        var obj = new this.objs.Objects();
        obj.name = params['name'];
        obj.catid = params['catid'];
        obj.data = Buffer.from(fdata, 'latin1');

        console.log("New object data length: " + fdata.length);
        obj.save( function() {
          var o = obj.toObject();
          delete o['data'];
          this.app.respond.jsonOk(res, o);
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  this.importCollider = function(req, res, params) {
    var resetcoll;
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var fdata = req.files['coll'][1];
        var objid = params['objid'];
        resetcoll = params['resetcoordinates'];
        this.objs.Objdata.deleteMany({objid: objid, type: { $lt: 5 }}, function(e, docs) {
          this.uploadColl(objid, fdata, function() {
            this.app.respond.jsonOk(res, {objid: objid, resetcollider: resetcoll});
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  this.importBreakable = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var fdata = req.files['break'][1];
        var objid = params['objid'];
        this.objs.Objdata.deleteMany({objid: objid, type: { $lt: 5 }}, function(e, docs) {
          this.uploadBreak(objid, fdata, function() {
            this.app.respond.jsonOk(res, {objid: objid});
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  this.setObject = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var fdata = req.files['data'][1];
        if( params['_id'] == '' ) {
          console.log("New object");
          var obj = new this.objs.Objects();
          this.uploadZip(obj._id, fdata, function(basisdata) {
            obj.name = params['name'];
            obj.tags = params['tags'];
            obj.catid = params['catid'];
            obj.scriptid = params['scriptid'];
            obj.data = basisdata;
            obj.save( function() {
              var o = obj.toObject();
              delete o['data'];
              this.app.respond.jsonOk(res, o);
            }.bind(this));
          }.bind(this));
        } else {
          console.log("Find object");
          this.objs.Objects.find({_id: params['_id']}, function(e,docs) {
            if( docs.length <= 0 ) {
              this.app.respond.jsonStatus(res, 'error', 'Not found objectid ' + params['_id']);
              return;
            }
            var obj = docs[0];
            obj.name = params['name'];
            obj.tags = params['tags'];
            obj.catid = params['catid'];
            obj.scriptid = params['scriptid'];
            if( fdata.length > 0 ) {
              console.log("Uploaded new scene file");
              fs.rmdir('/objs/' + obj._id, {recursive:true}, function(e) {
                if( e ) {
                  console.log("rmdir error", e);
                  this.app.respond.jsonStatus(res, 'error', 'Filesystem error');
                } else {
                  this.uploadZip(obj._id, fdata, function(basisdata) {
                    console.log("Scene file length: " + basisdata.length);
                    obj.data = basisdata;
                    obj.save( function() {
                      var o = obj.toObject();
                      delete o['data'];
                      this.app.respond.jsonOk(res, o);
                    }.bind(this));
                  }.bind(this));
                }
              }.bind(this));
            } else {
              console.log("Update without upload");
              obj.save( function() {
                var o = obj.toObject();
                delete o['data'];
                this.app.respond.jsonOk(res, o);
              }.bind(this));
            }
          }.bind(this));
        }
      }.bind(this));
    }.bind(this));
  };

  this.setMap = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var envdata = req.files['envmap'][1];
        var skydata = req.files['skydome'][1];
        if( params['_id'] == '' ) {
          console.log("New map");
          var obj = new this.objs.Maps();
          obj.name = params['name'];
          if( envdata.length > 0 ) {
            obj.envmap = this.uploadEnvmap(obj._id, envdata);
          }
          if( skydata.length > 0 ) {
            console.log("skydome", req.files['skydome'][2]);
            obj.skydome = this.uploadSkydome(obj._id, req.files['skydome'][2], skydata);
          }
          obj.save( function() {
            var o = obj.toObject();
            this.app.respond.jsonOk(res, o);
          }.bind(this));
        } else {
          console.log("Find map");
          this.objs.Maps.find({_id: params['_id']}, function(e,docs) {
            if( docs.length <= 0 ) {
              this.app.respond.jsonStatus(res, 'error', 'Not found mapid ' + params['_id']);
              return;
            }
            var obj = docs[0];
            obj.name = params['name'];
            if( envdata.length > 0 ) {
              obj.envmap = this.uploadEnvmap(obj._id, envdata);
            }
            if( skydata.length > 0 ) {
              console.log("skydome", req.files['skydome'][2]);
              obj.skydome = this.uploadSkydome(obj._id, req.files['skydome'][2], skydata);
            }
            obj.save( function() {
              var o = obj.toObject();
              this.app.respond.jsonOk(res, o);
            }.bind(this));
          }.bind(this));
        }
      }.bind(this));
    }.bind(this));
  };

  this.delObject = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      console.log("delObject", params);
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var player = docs[0].toObject();

        if( true ) { // player.security > 0 ) {
          this.objs.Objects.deleteOne({_id: params['id']}, function(e) {
            if( e ) {
              this.app.respond.jsonStatus(res, 'error', 'Not found objectid ' + params['id']);
            }

            this.objs.Objdata.deleteMany({objid: params['id']}, function(err) {
              if( err ) {
                this.app.respond.jsonStatus(res, 'error', 'Could not delete objects');
              } else {
                this.objs.Mapobjects.deleteMany({objid: params['id']}, function(E) {
                  if( E ) {
                    this.app.respond.jsonStatus(res, 'error', 'Could not delete objects');
                  } else {
                    if( fs.existsSync('/objs/' + params['id']) ) {
                      fs.rmdir('/objs/' + params['id'], {recursive:true}, function(e) {
                        if( e ) {
                          console.log("rmdir error: ", e);
                          this.app.respond.jsonStatus(res, 'error', 'Not found object datapath');
                        } else {
                          this.app.respond.jsonOk(res, {id:params['id']});
                        }
                      }.bind(this));
                    } else {
                      this.app.respond.jsonOk(res, {id:params['id']});
                    }
                  }
                }.bind(this));
              }
            }.bind(this));
          }.bind(this));
        } else {
          this.app.respond.jsonStatus(res, 'error', 'Not an admin');
        }
      }.bind(this));
    }.bind(this));
  };

  this.delMap = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      console.log("delMap", params);
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var player = docs[0].toObject();

        if( true ) { // player.security > 0 ) {
          this.objs.Maps.deleteOne({_id: params['id']}, function(e) {
            if( e ) {
              this.app.respond.jsonStatus(res, 'error', 'Not found mapid ' + params['id']);
            }

            this.objs.Mapobjects.deleteMany({mapid: params['id']}, function(E) {
              if( e ) {
                this.app.respond.jsonStatus(res, 'error', 'Could not delete objects');
              } else {
                this.app.respond.jsonOk(res, {id:params['id']});
              }
            }.bind(this));
          }.bind(this));
        } else {
          this.app.respond.jsonStatus(res, 'error', 'Not an admin');
        }
      }.bind(this));
    }.bind(this));
  };


  this.setCategory = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        if( params['_id'] == '' ) {
          console.log("New category");
          var obj = new this.objs.Objcats();
          obj.name = params['name'];
          obj.save( function() {
            var o = obj.toObject();
            this.app.respond.jsonOk(res, o);
          }.bind(this));
        } else {
          console.log("Find category");
          this.objs.Objcats.find({_id: params['_id']}, function(e,docs) {
            if( docs.length <= 0 ) {
              this.app.respond.jsonStatus(res, 'error', 'Not found catid ' + params['_id']);
              return;
            }
            var obj = docs[0];
            obj.name = params['name'];
            obj.save( function() {
              var o = obj.toObject();
              this.app.respond.jsonOk(res, o);
            }.bind(this));
          }.bind(this));
        }
      }.bind(this));
    }.bind(this));
  };

  this.delCategory = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      console.log("delCategory", params);
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var player = docs[0].toObject();

        if( true ) { // player.security > 0 ) {
          this.objs.Objcats.deleteOne({_id: params['id']}, function(e) {
            if( e ) {
              this.app.respond.jsonStatus(res, 'error', 'Not found catid ' + params['id']);
            }

            this.app.respond.jsonOk(res, {id:params['id']});
          }.bind(this));
        } else {
          this.app.respond.jsonStatus(res, 'error', 'Not an admin');
        }
      }.bind(this));
    }.bind(this));
  };

  this.setScriptEvent = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        this.objs.Scripts.find({_id: params['id']}, function(e,docs) {
          if( docs.length <= 0 ) {
            this.app.respond.jsonStatus(res, 'error', 'Not found scriptid ' + params['_id']);
            return;
          }
          var obj = docs[0];
          var ev;
          if( obj.events.length != 0 )
            ev = JSON.parse(obj.events);
          else
            ev = {};
          ev[params['event']] = params['script'];
          obj.events = JSON.stringify(ev);
          obj.save( function() {
            var o = obj.toObject();
            this.app.respond.jsonOk(res, o);
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };
  this.delScriptEvent = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        this.objs.Scripts.find({_id: params['id']}, function(e,docs) {
          if( docs.length <= 0 ) {
            this.app.respond.jsonStatus(res, 'error', 'Not found scriptid ' + params['_id']);
            return;
          }
          var obj = docs[0];
          var ev;
          if( obj.events.length != 0 )
            ev = JSON.parse(obj.events);
          else
            ev = {};
          delete ev[params['event']];
          obj.events = JSON.stringify(ev);
          obj.save( function() {
            var o = obj.toObject();
            this.app.respond.jsonOk(res, o);
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  this.setScript = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        if( params['_id'] == '' ) {
          console.log("New script");
          var obj = new this.objs.Scripts();
          obj.name = params['name'];
          obj.save( function() {
            var o = obj.toObject();
            this.app.respond.jsonOk(res, o);
          }.bind(this));
        } else {
          console.log("Find script");
          this.objs.Scripts.find({_id: params['_id']}, function(e,docs) {
            if( docs.length <= 0 ) {
              this.app.respond.jsonStatus(res, 'error', 'Not found scriptid ' + params['_id']);
              return;
            }
            var obj = docs[0];
            obj.name = params['name'];
            obj.save( function() {
              var o = obj.toObject();
              this.app.respond.jsonOk(res, o);
            }.bind(this));
          }.bind(this));
        }
      }.bind(this));
    }.bind(this));
  };

  this.delScript = function(req, res, params) {
    this.app.sing.mongosess.requireAuth( req, res, params, function(auth) {
      console.log("delCategory", params);
      this.objs.Players.find({userid: auth.userid}, function(e,docs) {
        var player = docs[0].toObject();

        if( true ) { // player.security > 0 ) {
          this.objs.Scripts.deleteOne({_id: params['id']}, function(e) {
            if( e ) {
              this.app.respond.jsonStatus(res, 'error', 'Not found scriptid ' + params['id']);
            }

            this.app.respond.jsonOk(res, {id:params['id']});
          }.bind(this));
        } else {
          this.app.respond.jsonStatus(res, 'error', 'Not an admin');
        }
      }.bind(this));
    }.bind(this));
  };

};
