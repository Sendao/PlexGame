import { DDSLoader } from 'https://unpkg.com/three@0.123.0/examples/jsm/loaders/DDSLoader.js';
import { CombinedControls } from '/js/plex/CombinedControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.123.0/examples/jsm/loaders/GLTFLoader.js';
import { Environs } from '/js/plex/environs.js';
import { GameLoader } from '/js/plex/loader.js';
import { Util } from '/js/plex/util.js';

window.drawMap = function(id)
{
  disposeWindowManager();
  var mapobj = new mapObject(id);
  setWindowManager(mapobj);
};
function updOrbitals()
{
  if( windowmanager instanceof mapObject )
    windowmanager.updOrbitals();
  else
    console.log("Wrong manager - map");
}
window.deleteObject = function(objn)
{
  var mgr = windowmanager;
  if( mgr instanceof mapObject )
    mgr.delObject(objn);
}

window.addToScene = function(mapobj)
{
  var mgr = windowmanager;
  if( mgr instanceof mapObject )
    mgr.addObject(mapobj, true);
}

window.updateMapObject = function(objno)
{
  var mgr = windowmanager;
  if( mgr instanceof mapObject )
    mgr.updateMapObject(objno, true);
}

window.moveObject = function(objn,x,y,z)
{
  var mgr = windowmanager;
  if( mgr instanceof mapObject )
    mgr.moveObject(objn);
}
window.rotateObject = function(objn)
{
  var mgr = windowmanager;
  if( mgr instanceof mapObject )
    mgr.rotateObject(objn);
}
window.scaleObject = function(objn)
{
  var mgr = windowmanager;
  if( mgr instanceof mapObject )
    mgr.scaleObject(objn);
}

window.useCamera = function(orthocam)
{
  var mgr = windowmanager;
  if( mgr instanceof mapObject ) {
    mgr.buildCamera(orthocam);
    mgr.mapRender();
  }
}

window.addGrid = function(unitsize,gridsize)
{
  var mgr = windowmanager;
  if( mgr instanceof mapObject )
    mgr.addGrid(unitsize,gridsize);
}
window.clearGrid = function()
{
  var mgr = windowmanager;
  if( mgr instanceof mapObject )
    mgr.clearGrid();
}

var mapObject = function(id)
{
  var i;
  for( i=0; i<maps.length; ++i ) {
    if( maps[i]._id == id ) {
      break;
    }
  }
  this.map = maps[i];
  console.log("MapId: " + id + ":",this.map);
  this.mapobjs = [];

  this.id = id;
  this.controls = null;
  this.gridobj = null;
  this.useres = '';

  var e = gE("mapviewer");

  this.clearGrid = function(userender)
  {
    if( this.gridobj ) {
      console.log("Clearing gridobj");
      this.scene.remove(this.gridobj);
      this.gridobj=null;
    }
    if( userender !== false )
      this.mapRender();
  };

  this.addGrid = function(unitsize, gridsize)
  {
    unitsize = parseFloat(unitsize);
    gridsize = parseInt(gridsize);
    if( this.gridobj ) {
      clearGrid(false);
    }
    console.log("Drawing grid " + unitsize + "*" + gridsize);
    var i=0, j=0;
    var grp = new THREE.Group();
    grp.name = grp.myname = 'grid';
    var line, mat, pts, geom;
    var end = gridsize*unitsize/2;

    mat = new THREE.LineBasicMaterial({color: 0xc3c3c3});

    for( i=-end; i<=end; i+=unitsize ) {
      pts=[];
      pts.push( new THREE.Vector3( i, 0, -end ) );
      pts.push( new THREE.Vector3( i, 0, end ) );
      geom = new THREE.BufferGeometry().setFromPoints(pts);
      line = new THREE.Line(geom,mat);
      grp.add(line);

      pts=[];
      pts.push( new THREE.Vector3( -end, 0, i ) );
      pts.push( new THREE.Vector3( end, 0, i ) );
      geom = new THREE.BufferGeometry().setFromPoints(pts);
      line = new THREE.Line(geom,mat);
      grp.add(line);
    }

    this.gridobj = grp;
    this.scene.add(this.gridobj);
    console.log("Done");
    this.mapRender();
  };

  this.delObject = function(objn)
  {
    var i;
    var objs = this.controls.getObjects();
    var obj = null;
    for( i=0; i < objs.length; ++i ) {
      if( parseInt(objs[i].myname) == objn ) {
        obj = objs[i];
        break;
      }
    }
    if( obj != null ) {
      this.scene.remove( obj );
      this.controls.delObject( obj );
      this.mapRender();
    }
  };

  this.addObject = function(obj, do_record_undo)
  {
    var objno = this.mapobjs.length;
    this.mapobjs.push(obj);
    radStore("mapobjs", this.mapobjs);
    if( do_record_undo === true )
      record_undo("created",objno);

    var loader = new GLTFLoader().setPath( "/plex/res?id=" + obj.objid + "/" );
    this.loader.getObjectData(obj.objid);
    loader.load( 'basis', function(gltf) {
      gltf.scene.name = gltf.scene.myname = objno;
      gltf.scene.traverse(function(node) {
        if( node.name == 'lblue' || node.name == 'lred' || node.name == 'lgreen' )
          return;
        if( node.name == 'cblue' || node.name == 'cred' || node.name == 'cgreen' )
          return;
        if( node.name == 'grid' || node.name == 'skybox' )
          return;
        if( node.isMesh ) {
          if( this.envmap != null ) {
            node.material.envMap = this.envmap;
          }
          node.castShadow = true;
          node.receiveShadow = true;
        }
        if( node instanceof THREE.Light ) {
          this.castShadowsFrom(node);
          console.log("Found light");
        }
      }.bind(this));
      this.scene.add( gltf.scene );
      this.controls.addObject( gltf.scene );
      gltf.scene.position.copy( new THREE.Vector3(obj.x,obj.y,obj.z) );
      gltf.scene.rotation.copy( new THREE.Euler(obj.rotX,obj.rotY,obj.rotZ,'XYZ') );
      this.mapRender();
    }.bind(this));
  };



  this.updateMapObject = function(objno)
  {
    var obj = radVar("mapobjs." + objno);
    this.scene.traverse(function(node) {
      if( node.myname == objno ) {
        console.log("updateMO found target");
        node.position.set( obj.x, obj.y, obj.z );
        node.rotation.x = obj.rotX;
        node.rotation.y = obj.rotY;
        node.rotation.z = obj.rotZ;
      }
    }.bind(this));
  };

  this.moveObject = function(objno)
  {
    var obj = radVar("mapobjs." + objno);
    this.scene.traverse(function(node) {
      if( node.myname == objno ) {
        console.log("moveObject found target");
        node.position.x = obj.x;
        node.position.y = obj.y;
        node.position.z = obj.z;
        this.mapRender();
      }
    }.bind(this));
  }
  this.rotateObject = function(objno)
  {
    var obj = radVar("mapobjs." + objno);
    this.scene.traverse(function(node) {
      if( node.myname == objno ) {
        console.log("moveObject found target");
        node.rotation.x = obj.rotX;
        node.rotation.y = obj.rotY;
        node.rotation.z = obj.rotZ;
        this.mapRender();
      }
    }.bind(this));
  }
  this.scaleObject = function(objno)
  {
    var obj = radVar("mapobjs." + objno);
    this.scene.traverse(function(node) {
      if( node.myname == objno ) {
        console.log("scaleObject found target");
        node.scale.x = obj.sclX;
        node.scale.y = obj.sclY;
        node.scale.z = obj.sclZ;
        this.mapRender();
      }
    }.bind(this));
  }

  this.dragUpdate = function(object)
  {
    var obj = object.object;
    var selobj = radVar("selectedobj");
    var mapobj = this.mapobjs[selobj];//radVar("mapobjs." + selobj);
    var roundby = 0.2;

    //! Snap to grid
    var s2g = document.forms['ctrl'].snaptogrid.checked;
    //! Snap to objects
    var s2o = document.forms['ctrl'].snaptomesh.checked;

    if( s2g ) {
      obj.position.x = roundBy(obj.position.x, roundby);
      obj.position.y = roundBy(obj.position.y, roundby);
      obj.position.z = roundBy(obj.position.z, roundby);
      this.controls.moveCursorTo(obj.position);
    }

    //! Update mapobjs
    var pos = obj.position;
    mapobj.x = pos.x;
    mapobj.y = pos.y;
    mapobj.z = pos.z;
    var rot = obj.rotation;
    mapobj.rotX = rot.x;
    mapobj.rotY = rot.y;
    mapobj.rotZ = rot.z;
    var scl = obj.scale;
    mapobj.sclX = scl.x;
    mapobj.sclY = scl.y;
    mapobj.sclZ = scl.z;
    radStore("mapobjs." + selobj, mapobj);
  }

  // Setup scene
  this.camera = null;
  this.scene = null;
  this.renderer = null;
  this.controls = null;
  this.loader = new GameLoader(this);
  this.tloader = new THREE.TextureLoader();

  this.mapRender = function()
  {
    if( this.renderer == null ) return;
    this.renderer.render(this.scene,this.camera);
  }

  this.scene = new THREE.Scene();
  this.scene.background = new THREE.Color(0x232323);
  {
    const intensity = 1;
    const light = new THREE.AmbientLight( 0x404040, intensity ); // soft white light
    this.scene.add(light);
  }

  this.mainlight = null;
  this.util = new Util(this);

  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set( 0, 500, 0 );
    this.util.castShadowsFrom(light, true);
    this.scene.add(light);
    this.mainlight = light;
  }

  this.lastUpdate = 0;
  this.updateFrame = function() {
    var now = new Date().getTime();
    var elapsed;

    if( this.lastUpdate == 0 ) {
      elapsed = 0;
    } else {
      elapsed = now - this.lastUpdate;
    }
    var fps = 60;
    var fpstime = 33;
    setTimeout(this.updateFrame.bind(this), fpstime);

    //this.particles.update(elapsed/1000);
    this.environs.update(elapsed);
    this.mapRender();
    this.lastUpdate = now;
  }

  this.getMap = function()
  {
    var i, maps=radVar("maps");

    for( i=0; i<maps.length; ++i ) {
      if( maps[i]._id == this.id )
        return i;
    }
    alert("Invalid map - not stored locally");
    return -1;
  }

  console.log("Window presize: " + e.clientWidth + ", " + e.clientHeight);

  this.buildCamera = function(orthocam)
  {
    console.log("Updating camera");
    if( orthocam ) {
      this.camera = new THREE.OrthographicCamera( e.clientWidth / -2, e.clientWidth / 2, e.clientHeight / 2, e.clientHeight / -2, 0.1, 10000 );
      this.camera.position.set( 0, 10, -10 );
      if( this.controls ) {
        this.controls.setCamera(this.camera);
        this.controls.zoom0 = 40;
        this.controls.reset();
        this.mapRender();
      }
    } else {
      this.camera = new THREE.PerspectiveCamera( 45, e.clientWidth / e.clientHeight, 0.1, 10000 );
      this.camera.position.set( 0, 10, -20 );
      if( this.controls ) {
        this.controls.setCamera(this.camera);
        this.controls.zoom0 = 1;
        this.controls.reset();
        this.mapRender();
      }
    }
  }

  this.renderer = new THREE.WebGLRenderer( { antialias: true } );
  this.renderer.setPixelRatio( window.devicePixelRatio );
  this.renderer.setSize( e.clientWidth, e.clientHeight );
  this.renderer.shadowMap.enabled = true;
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure = 0.25;
  this.renderer.outputEncoding = THREE.sRGBEncoding;
  e.appendChild( this.renderer.domElement );

  //this.buildEnvmap();
  this.environs = new Environs(this);
  this.environs.createClouds();
  this.environs.buildSkydome();
  this.buildCamera(false);

	this.controls = new CombinedControls( [], this.camera, this.renderer.domElement, this.scene );
	this.controls.addEventListener( 'change', this.mapRender.bind(this) ); // use if there is no animation loop
	this.controls.addEventListener( 'drag', this.dragUpdate.bind(this) ); // use if there is no animation loop
	this.controls.minDistance = 0.1;
	this.controls.maxDistance = 100;
	this.controls.target.set( 0, 0, 0 );
	this.controls.update();

  this.loader.requestObjects(false);
  this.mapRender();
  setTimeout(this.updateFrame.bind(this),30);

  this.dispose = function()
  {
    this.controls.deactivate();
  }
}
