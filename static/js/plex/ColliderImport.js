import * as THREE from 'https://unpkg.com/three@0.123.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.123.0/examples/jsm/loaders/GLTFLoader.js';

var importer = null;

window.gotCollider = function(data)
{
  radStore("objimport_msg", "Uploaded. Parsing...");
  newWindow("objimporter");

  var o = JSON.parse(data);
  var objid = o.data.objid;
  var resetcollider = o.data.resetcollider;
  console.log("gotCollider",o);
  window.objimport = importer = new objImporter(objid, resetcollider);
  importer.loadup();
  //! loadup(datapath)
}

var objImporter = function(objid, resetcollider)
{
  var i;

  this.scene = null;
  this.sceneobjs = [];
  this.mapobjs = [];
  this.resetcoords = resetcollider == "on";

  this.loadup = function()
  {
    var frm = document.forms['uploadform9'];
    if( frm.resetcoords.checked ) {
      console.log("Found resetcoords");
      this.resetcoords = true;
    } else {
      console.log("Don't resetcoords");
    }
    var loader = new GLTFLoader().setPath( "/plex/res?id=" + objid + "/coll/" );
    loader.load( "basis", function(gltf) {
      this.scene = gltf.scene;
      radStore("objimport_msg", "Parsed. Analyzing...");
      console.log("Loaded. Analyzing...");
      this.analyze();
    }.bind(this));
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
      if( o.geometry instanceof THREE.BufferGeometry ) {
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
    console.log("Geometry: ", g.length + "::" + g);

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
  this.getSphereSize = function(obj1)
  {
    var box;
    if( obj1.geometry.boundingBox == null ) obj1.geometry.computeBoundingBox();
    box = obj1.geometry.boundingBox.clone().applyMatrix4( obj1.matrixWorld );
    return (box.max.x - box.min.x) / 2;
  };

  this.analyze = function()
  {
    var ix = [this.scene];
    var irow;

    do {
      irow = ix.shift();
      if( irow.children.length > 0 ) {
        ix.push(...irow.children);
        continue;
      }
      if( irow.isMesh ) {
        this.sceneobjs.push( irow );
      }
    } while( ix.length > 0 );

    radStore("objimport_msg", "Uploading analysis...");
    this.uploadData();
  };

  this.uploadData = function()
  {
    this.mapobjs = [];
    var mo, so;
    var i, joined;
    var fbox, ftype, fsize;
    var bbp, tris, verts, face, geo, j;
    var joinobj;
    var pos, quat, eul;

    for( i=0; i < this.sceneobjs.length; ++i ) {
      so = this.sceneobjs[i];

      tris = null;
      if( this.isBox(so) ) {
        console.log("Found box: " + so.name);
        ftype = 1;
        var box;
        if( so.geometry.boundingBox == null ) so.geometry.computeBoundingBox();
        box = so.geometry.boundingBox.clone();//.applyMatrix4( so.matrixWorld );
        fsize = [ box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z, box.min.x, box.min.y, box.min.z ];
        console.log("Size: ", fsize);
      } else if( false ) { //! isSphere
        ftype = 2;
        fsize = this.getSphereSize(so);
        console.log("Found sphere(" + fsize + "): " + so.name);
      } else {
        geo = so.geometry;
        ftype = 3;
        if( geo instanceof THREE.BufferGeometry ) {
          var poss = geo.getAttribute('position');
          tris = [];
          for( j=0; j<poss.count; ++j ) {
            tris.push( poss.getX(j), poss.getY(j), poss.getZ(j) );
          }
        } else {
          verts = geo.vertices;
          tris = [];
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
      pos = new THREE.Vector3();
      quat = new THREE.Quaternion();
      so.getWorldPosition(pos);
      so.getWorldQuaternion(quat);
      eul = new THREE.Euler();
      eul.setFromQuaternion(quat);
      if( this.resetcoords ) {
        pos.x = pos.y = pos.z = 0;
      }
      joinobj = {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        rotX: eul.x,
        rotY: eul.y,
        rotZ: eul.z,
        sz: fsize,
        pname: so.name
      };

      if( tris != null )
        joinobj.tris = tris;

      joined = JSON.stringify(joinobj);
      mo = {
        objid: objid,
        _id: '',
        type: ftype,
        data: joined
      };
      this.mapobjs.push(mo);
    }

    var mapobj = { 'objs': this.mapobjs };
    var args = buildArgString(mapobj);
    HtmlRequest('/plex/objdata',args,this.savedObjectData.bind(this));
  };

  this.savedObjectData = function(data)
  {
    console.log("savedObjData",data);
    var ids = JSON.parse(data).data;
    var mo = this.mapobjs;
    var n;

    console.log("Ids: ", ids);
    for( n=0; n<mo.length; ++n ) {
      if( mo[n].deleted == 1 ) {
        mo.splice(n,1);
        --n;
        continue;
      }
    }
    for( n=0; n<ids.length; ++n ) {
      if( mo[n]._id == '' ) {
        console.log("fix id " + n);
        mo[n]._id = ids[n];
      }
    }

    radStore("objimport_msg", "All done!");
    alert("Collider save complete");
  };
};
