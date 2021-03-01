import { GLTFLoader } from 'https://unpkg.com/three@0.124.0/examples/jsm/loaders/GLTFLoader.js';

var importer = null;

window.importCollider = function(mapid)
{
  radStore("colimporter", {'mapid': mapid});
  newWindow("colimporter","colimporter");
  window.importer = importer = new colImporter(mapid);
};

window.gotCollisionMap = function(data)
{
  radStore("importer_msg", "Uploaded. Parsing...");
  console.log("Data from import: " + data);
  var o  = JSON.parse(data);
  importer.loadup(o.data.path);
}

var colImporter = function(mapid)
{
  var i;

  this.scene = null;
  this.colliders = [];

  this.loadup = function(datapath)
  {
    var loader = new GLTFLoader().setPath( "/plex/mres?id=" + mapid + "/" );
    loader.load( datapath, function(gltf) {
      this.scene = gltf.scene;
      radStore("importer_msg", "Parsed. Analyzing...");
      console.log("Loaded. Analyzing...");
      this.analyze();
    }.bind(this));
  };

  this.fixName = function(str)
  {
    var pname;
    var px = str.indexOf("_(");
    if( px != -1 ) {
      pname = str.substr(0,px);
    } else {
      pname = str;
    }
    var i = pname.length-1;
    var c, ci, notone=false;
    var found=false;
    do {
      c = pname[i];
      ci = parseInt(c);
      if( isNaN(ci) ) {
        if( c == '_' ) {
          found=true;
        }
        break;
      } else if( ci != 1 ) {
        notone=true;
      }
      i--;
    } while(i>0);

    if( found ) {
      if( notone )
        return '';
      pname = pname.substr(0,i);
    }

    return pname;
  };

  this.geometries = {};
  this.getGeometryOf = function(obj)
  {
    if( obj.id in this.geometries )
      return this.geometries[obj.id];
    var verts = [];
    var pts = [];
    var trv = [obj];
    var o;
    var i, j, vtx = new THREE.Vector3();

    while( trv.length > 0 ) {
      o = trv.shift();
      if( typeof o.geometry.getAttribute != 'undefined' ) {
        pts = o.geometry.getAttribute('position');
        for( i=0; i< pts.count; ++i ) {
          vtx.fromBufferAttribute( pts, i );
          verts.push(vtx.clone());
        }
      } else if( o.geometry && o.geometry.vertices && o.geometry.vertices.length > 0 ) {
        for( i=0; i< o.geometry.vertices.length; ++i ) {
          verts.push( o.geometry.vertices[i] );
        }
      }
      for( i=0; i< o.children.length; ++i ) {
        trv.push( o.children[i] );
      }
    }
    this.geometries[obj.id] = verts;
    return verts;
  };

  this.isBox = function(obj1)
  {
    var g = this.getGeometryOf(obj1);
    var i = g.length;
    //console.log("Geometry: ", g.length);
    if( i == 24 || i == 36 ) return true;
    return false;
  };
  this.bboxPosition = function(obj)
  {
    var p = new THREE.Vector3();
    if( obj.geometry.boundingBox == null ) obj.geometry.computeBoundingBox();
    var bb = obj.geometry.boundingBox;
    p.x = (bb.max.x + bb.min.x) / 2;
    p.y = (bb.max.y + bb.min.y) / 2;
    p.z = (bb.max.z + bb.min.z) / 2;
    return p;
  };
  this.getBoxSize = function(geo)
  {
    var min={x:0,y:0,z:0};
    var max={x:0,y:0,z:0};
    var verts,vtx = new THREE.Vector3();
    var i;
    if( typeof geo.getAttribute != 'undefined' ) {
      verts = geo.getAttribute('position');
      for( i=0; i< verts.count; ++i ) {
        vtx.fromBufferAttribute( verts, i );
        if( vtx.x < min.x ) min.x = vtx.x;
        if( vtx.x > max.x ) max.x = vtx.x;
        if( vtx.y < min.y ) min.y = vtx.y;
        if( vtx.y > max.y ) max.y = vtx.y;
        if( vtx.z < min.z ) min.z = vtx.z;
        if( vtx.z > max.z ) max.z = vtx.z;
      }
    } else if( o.geometry && o.geometry.vertices && o.geometry.vertices.length > 0 ) {
      for( i=0; i< o.geometry.vertices.length; ++i ) {
        vtx = o.geometry.vertices[i];
        if( vtx.x < min.x ) min.x = vtx.x;
        if( vtx.x > max.x ) max.x = vtx.x;
        if( vtx.y < min.y ) min.y = vtx.y;
        if( vtx.y > max.y ) max.y = vtx.y;
        if( vtx.z < min.z ) min.z = vtx.z;
        if( vtx.z > max.z ) max.z = vtx.z;
      }
    }
    return {min:min,max:max};
  };
  this.getSphereSize = function(obj1)
  {
    var box;
    if( obj1.geometry.boundingBox == null ) obj1.geometry.computeBoundingBox();
    box = obj1.geometry.boundingBox.clone();//.applyMatrix4( obj1.matrixWorld );
    return (box.max.x - box.min.x) / 2;
  };

  this.analyzeOne = function(obj)
  {
    var i, j, so, geo, face;
    var bbp, pos, quat, eul;
    var ftype, fsize;
    var tris, verts;
    var joinobj, mo, joined;
    var objs = [], moxobj=null;

    //! Find matching mapobj
    var mox = radVar("mapobjs");
    var found = false;
    for( i=0; i<mox.length; ++i ) {
      moxobj = objects[ objmap[ mox[i].objid ] ];
      if( moxobj.name == obj.name ) {
        found=true;
        break;
      }
    }
    if( !found ) {
      console.log("Unmatched item " + obj.name);
      return;
    }
    console.log("Found item " + obj.name + ": " + obj.children.length + " children.");

    if( obj.children.length == 0 ) { // object is, itself, the collider.
      // discard its rotation/position data.
      obj.position.set(0,0,0);
      obj.rotation.set(0,0,0);
      obj = { children: [ obj ] };
    }

    for( i=0; i<obj.children.length; ++i ) {
      so = obj.children[i];
      if( !so.isMesh ) continue;
      tris = null;
      if( this.isBox(so) ) {
        console.log("Found box: " + so.name);
        ftype = 1;
        var box;
        //if( so.geometry.boundingBox == null ) so.geometry.computeBoundingBox();
        box = this.getBoxSize(so.geometry);// so.geometry.boundingBox.clone();//.applyMatrix4( so.matrixWorld );
        fsize = [ box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z, box.min.x, box.min.y, box.min.z ];
        console.log("Size: ", fsize);
      } else if( false ) { //! isSphere
        ftype = 2;
        fsize = this.getSphereSize(so);
        console.log("Found sphere(" + fsize + "): " + so.name);
      } else {
        geo = so.geometry;
        ftype = 3;
        if( typeof geo.getAttribute != 'undefined' ) {
          var poss = geo.getAttribute('position');
          tris = [];
          console.log("Get tris points: " + poss.count);
          for( j=0; j<poss.count; ++j ) {
            tris.push( poss.getX(j), poss.getY(j), poss.getZ(j) );
          }
        } else {
          verts = geo.vertices;
          tris = [];
          console.log("Get tris faces: " + geo.faces.length);
          for( j=0; j<geo.faces.length; ++j ) {
            face = geo.faces[j];
            if( face instanceof THREE.Face3 ) {
              tris.push(verts[face.a].x, verts[face.a].y, verts[face.a].z,
                        verts[face.b].x, verts[face.b].y, verts[face.b].z,
                        verts[face.c].x, verts[face.c].y, verts[face.c].z);
            } else if( face instanceof THREE.Face4 ) {
              tris.push(verts[face.a].x, verts[face.a].y, verts[face.a].z,
                        verts[face.b].x, verts[face.b].y, verts[face.b].z,
                        verts[face.d].x, verts[face.d].y, verts[face.d].z);
              tris.push(verts[face.b].x, verts[face.b].y, verts[face.b].z,
                        verts[face.c].x, verts[face.c].y, verts[face.c].z,
                        verts[face.d].x, verts[face.d].y, verts[face.d].z);
            }
          }
        }
      }
      bbp = this.bboxPosition(so);
      pos = so.position;//new THREE.Vector3();
      //quat = so.quaternion;//new THREE.Quaternion();
      //so.getWorldPosition(pos);
      //so.getWorldQuaternion(quat);
      //eul = new THREE.Euler();
      //eul.setFromQuaternion(quat);
      eul = so.rotation;
      joinobj = {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        rotX: eul.x,
        rotY: eul.y,
        rotZ: eul.z,
        sclX: so.scale.x,
        sclY: so.scale.y,
        sclZ: so.scale.z,
        sz: fsize,
        pname: so.name
      };

      if( tris != null )
        joinobj.tris = tris;

      joined = JSON.stringify(joinobj);
      mo = {
        objid: moxobj._id,
        _id: '',
        type: ftype,
        data: joined
      };

      objs.push(mo);
    }

    this.colliders.push({ objs:objs });
    //! create objects
    //! add to this.colliders
  };

  this.analyze = function()
  {
    var ix = [this.scene];
    var irow, i, found;
    var named, names = {};

    do {
      irow = ix.shift();
      if( irow.name != '' && irow.name != 'Scene' ) {
        named = this.fixName(irow.name);
        if( named == '' ) continue;
        if( named in names ) continue;
        names[named] = true;
        this.analyzeOne(irow);
      } else {
        ix.push(...irow.children);
      }
    } while( ix.length > 0 );

    this.uploadOne();
  };

  this.uploadOne = function()
  {
    var obj = this.colliders.shift();
    var mapobj = { 'objs': obj.objs };
    var args = buildArgString(mapobj);
    console.log("Send data: ", obj.objs);
    HtmlRequest('/plex/objdata',args,this.savedObjectData.bind(this));
  };


  this.savedObjectData = function(data)
  {
    console.log("savedObjData",data);
    var ids = JSON.parse(data).data;

    if( this.colliders.length > 0 ) {
      this.uploadOne();
    } else {
      radStore("importer_msg", "All done!");
      alert("Collider import completed.");
    }
  };
};
