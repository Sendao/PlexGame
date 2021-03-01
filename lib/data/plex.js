var fs = require('fs');
var ObjectID = require('mongoose').Schema.Types.ObjectId;
var sharp = require('sharp');

module.exports = function PlayData() {
  this.loadModules = function() {
    var dn, d, i, q;
    var modules = {};

    dn = './lib/data/plex/';
    d = fs.readdirSync(dn);
    i = d.length;
    while (i > 0) {
      --i;
      var x = d[i].split('.');
      var dlname = x[0];
      if (x[x.length - 1] != 'js') continue;

      try {
        modules[dlname] = require('./plex/' + d[i]);
      } catch( e ) {
        console.log(e);
        return;
      }
    }

    for( i in modules ) {
      console.log("Install plexdata/" + i);
      var b = new modules[i]();
      for (q in b) {
        eval("this." + q + " = b['" + q + "'];")
      }
    }
  };

  this.startup = function() {
    console.log("Initializing Plex.js");

    this.loadModules();
  };


  this.getExt = function(str)
  {
    var n = str.lastIndexOf(".");
    var ext = str.substr(n+1);
    return ext;
  };

  this.findBasis2 = function(fromdir) {
    var tgtdir = fromdir;
    if( !fs.existsSync(tgtdir) )
      return false;
    var paths = fs.readdirSync(tgtdir);
    var i;

    for( i=0; i<paths.length; ++i ) {
      ext = this.getExt(paths[i]);
      if( ext == 'gltf' || ext == 'glb' ) {
        return paths[i];
      }
    }
    return false;
  };

  this.findBasis = function(objid, collider) {
    var tgtdir = '/objs/' + objid + (collider ? "/coll" : "");
    if( !fs.existsSync(tgtdir) )
      return false;
    var paths = fs.readdirSync(tgtdir);
    var i;

    for( i=0; i<paths.length; ++i ) {
      ext = this.getExt(paths[i]);
      if( ext == 'gltf' || ext == 'glb' ) {
        return paths[i];
      }
    }
    return false;
  };

  this.copyFile = function(from, to) {
    if( fs.existsSync(from) ) {
      var buf = fs.readFileSync(from, 'binary');
      fs.writeFileSync(to, buf, 'binary');
    } else {
      console.log("Missing binary " + from);
    }
  };

  this.reportafew = 5;
  this.resizeItem = function(objid, odata)
  {
    var gltftext;
    if( odata.length == 0 ) {
      var basis = this.findBasis(objid,false);
      if( !basis ) return false;
      var gltfpath = "/objs/" + objid + "/" + basis;
      var gltftext = fs.readFileSync(gltfpath);
    } else {
      gltftext = odata;
    }
    var gltf;
    try {
      gltf = JSON.parse(gltftext);
    } catch( e ) {
      console.log("error with text: /objs/" + objid);
      //console.log(e);
      return true;
    }
    var i, img, buffer, count;
    var smallgltf = JSON.parse(gltftext), mediumgltf = JSON.parse(gltftext);
    if( !fs.existsSync('/objs/' + objid) )
      fs.mkdirSync('/objs/' + objid);
    if( !fs.existsSync('/objs/' + objid + '/sml') )
      fs.mkdirSync('/objs/' + objid + '/sml');
    if( !fs.existsSync('/objs/' + objid + '/med') )
      fs.mkdirSync('/objs/' + objid + '/med');

    if( 'buffers' in gltf ) {
      for( i=0; i<gltf.buffers.length; ++i ) {
        if( gltf.buffers[i].uri.substr(0,5) == 'data:' )
          continue;
        this.copyFile('/objs/' + objid + '/' + gltf.buffers[i].uri,
                      '/objs/' + objid + '/med/' + gltf.buffers[i].uri);
        this.copyFile('/objs/' + objid + '/' + gltf.buffers[i].uri,
                      '/objs/' + objid + '/sml/' + gltf.buffers[i].uri);
      }
    }

    if( !('images' in gltf) || gltf.images.length <= 0 ) {
      fs.writeFileSync('/objs/' + objid + '/med/basis.gltf', JSON.stringify(mediumgltf));
      fs.writeFileSync('/objs/' + objid + '/sml/basis.gltf', JSON.stringify(smallgltf));
    }

    if( 'images' in gltf ) {
      /*
      for( i=0; i<gltf.textures.length; ++i ) {
        console.log("Translate /objs/" + objid + "/" + gltf.textures[i].name);
      }
      */
      var usebuffer=false;
      count = gltf.images.length;
      for( i=0; i<gltf.images.length; ++i ) {
        this.working = true;
        if( gltf.images[i].uri.slice(0,5) == 'data:' ) {
          //data:image/png;base64,
          var buf = gltf.images[i].uri;
          var comma = buf.indexOf(',');
          buf = buf.slice(comma+1);
          buffer = Buffer.from(buf, 'base64');
          usebuffer=true;
        } else {
          if( fs.existsSync('/objs/' + objid + '/' + gltf.images[i].uri) )
            buffer = fs.readFileSync('/objs/' + objid + '/' + gltf.images[i].uri);
          else {
            count--;
            continue;
          }
          usebuffer=false;
        }
        if( usebuffer ) {
          console.log("Found buffer " + objid + "/" + i + ": " + gltf.images[i].uri.slice(0,34));
        } else {
          console.log("Found image /objs/" + objid + "/" + gltf.images[i].uri.slice(0,34));
        }
        img = sharp(buffer);
        img.metadata().then( function(i, img, usebuffer, md) {
          console.log("Image dims: " + md.width + "x" + md.height);
          if( usebuffer ) {
            img.resize( Math.round(md.width/2), Math.round(md.height/2) ).png().toBuffer().then( function(imgdat) {
              mediumgltf.images[i].uri = 'data:image/png;base64,' + imgdat.toString('base64');

              img.resize( Math.round(md.width/4), Math.round(md.height/4) ).png().toBuffer().then( function(imgdat) {
                smallgltf.images[i].uri = 'data:image/png;base64,' + imgdat.toString('base64');
                console.log("Resized");

                count--;
                if( count == 0 ) {
                  console.log("Finished resizing an object, saving gltfs.");
                  fs.writeFileSync('/objs/' + objid + '/med/basis.gltf', JSON.stringify(mediumgltf));
                  fs.writeFileSync('/objs/' + objid + '/sml/basis.gltf', JSON.stringify(smallgltf));
                  this.working = false;
                }
              }.bind(this));
            }.bind(this));
          } else {
            img.resize( Math.round(md.width/2), Math.round(md.height/2) ).png().toBuffer().then( function(imgdat) {
              fs.writeFileSync('/objs/' + objid + '/med/' + gltf.images[i].uri, imgdat);

              img.resize( Math.round(md.width/4), Math.round(md.height/4) ).png().toBuffer().then( function(imgdat) {
                fs.writeFileSync('/objs/' + objid + '/sml/' + gltf.images[i].uri, imgdat);
                console.log("Resized");

                count--;
                if( count == 0 ) {
                  console.log("Finished resizing an object, saving gltfs (nonbuffered).");
                  fs.writeFileSync('/objs/' + objid + '/med/basis.gltf', JSON.stringify(mediumgltf));
                  fs.writeFileSync('/objs/' + objid + '/sml/basis.gltf', JSON.stringify(smallgltf));
                  this.working=false;
                }
              }.bind(this));
            }.bind(this));
          }
        }.bind(this,i,img,usebuffer));
      }
    }
    return true;
  };

  this.firstcycle = true;
  this.working = false;

  this.workcycle = function() {
    if( this.working ) return;
    if( this.firstcycle ) {
      if( false ) {
        this.objs.Objects.find({'resized': { $eq: true }}, function(e, docs) {
          var i;
          for( i=0;i<docs.length; ++i ) {
            docs[i].resized = false;
            docs[i].save();
          }
        }.bind(this));
      }
      this.firstcycle=false;
      return;
    }
    // Get objects that haven't been resized
    this.objs.Objects.findOne({'resized': { $ne: true }}, function(e, doc) {
      var i, obj;
      if( e ) { console.log(e); return; }
      if( typeof doc == 'undefined' || doc == null ) return;
      console.log("Check " + doc._id);

      this.resizeItem(doc._id, doc.data);
      doc.resized = true;
      doc.save();

    }.bind(this));
  };

};
