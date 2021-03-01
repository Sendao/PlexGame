import {GameControls } from '/js/plex/GameControls.js';
import {FollowControls} from '/js/plex/FollowControls.js';
import {SpatialIndex } from '/js/plex/SpatialIndex.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.123.0/examples/jsm/loaders/GLTFLoader.js';
import { Physics } from '/js/plex/physics.js';
import { Environs } from '/js/plex/environs.js';
import { Util } from '/js/plex/util.js';
import { ThreeAmmoDebugger } from '/js/plex/AmmoDebug.js';
import { ParticleSystem } from '/js/plex/particles.js';
import { GameLoader } from '/js/plex/loader.js';

window.drawGameMap = function(id)
{
  disposeWindowManager();
  var mapobj = new gameObject(id);
  setWindowManager(mapobj);
  //window.gamewindows[id] = { 'manager': mapobj, 'window': gE("gameviewer") };
};
window.updGameOrbitals = function()
{
  if( windowmanager instanceof gameObject )
    windowmanager.updOrbitals();
  else
    console.log("Wrong manager");
}

window.switchToVehicle = function(obj, objn)
{
  console.log("switchToVehicle:" + obj.myname);
  windowmanager.switchToVehicle(obj);
}

function getObjByName(name)
{
  var i;
  for( i=0; i<objects.length; ++i ) {
    if( objects[i].name == name )
      return objects[i];
  }
  return null;
}

var gameObject = function(id)
{
  var i;
  for( i=0; i<maps.length; ++i ) {
    if( maps[i]._id == id ) {
      break;
    }
  }
  this.map = maps[i];
  console.log("MapId: " + id + ":",this.map);

  this.id = id;
  this.controls = null;
  this.idlers = [];
  this.mapobjs = [];

  var e = gE("gameviewer");

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

  this.mychar = null;
  this.assignCharacter = function(obj)
  {
    var buildit=false;
    var v = new Ammo.btVector3(0,0,0);
    var body;

    if( this.mychar != null ) {
      body = this.mychar.body;
      this.world.removeRigidBody(body);
      body.setLinearVelocity(v);
      body.setAngularVelocity(v);
      body.setMassProps(0.0,v);
      body.setActivationState( 1 );
      //body.setCollisionFlags( 1 );
      this.world.addRigidBody(body);
      // subscribe to spatialidx:
      var box = this.physics.getBoxFor(this.mychar);
      this.spatialidx.add( box, this.mychar );
      buildit=true;
    }

    this.mychar = obj;
    if( buildit ) {
      // unsubscribe from spatialidx
      var box = this.physics.getBoxFor(obj);
      this.spatialidx.remove( box, obj );
      body = obj.body;
      this.world.removeRigidBody(body);
      body.setLinearVelocity( v );
      body.setAngularVelocity( v );
      body.setMassProps(1.0,v);
      body.setAngularFactor( 0, 1, 0 );
      body.setFriction( 0.05 );
      body.setGravity( v );
      //body.setCollisionFlags( 2 );
      body.setActivationState( 4 );
      this.world.addRigidBody(body);
      this.mytargetangle = this.controls.getRotationOf(obj);
    }
    this.controls.object = obj;
    this.controls.update();
  };

  this.useres = '';

  this.addObject = function(obj, ischaracter)
  {
    var objno = this.mapobjs.length;
    this.mapobjs.push(obj);
    radStore("mapobjs", this.mapobjs);

    this.loader.getObjectData(obj.objid);
    var loader = new GLTFLoader().setPath( "/plex/res?id=" + obj.objid + "/" + this.useres );
    loader.load( 'basis', function(gltf) {
      gltf.scene.name = gltf.scene.myname = objno;
      console.log("Add obj " + objno);
      if( ischaracter ) {
        this.assignCharacter(gltf.scene);
      }
      gltf.scene.position.copy( new THREE.Vector3(obj.x,obj.y,obj.z) );
      gltf.scene.rotation.copy( new THREE.Euler(obj.rotX,obj.rotY,obj.rotZ,'XYZ') );
      gltf.scene.rotation.reorder('YXZ');
      gltf.scene.myid = obj.objid;
      gltf.scene.myobj = objno;

      if( obj._id in moscripts ) {
        gltf.scene.script = new moscripts[obj._id](this,THREE);
        if( 'idle' in gltf.scene.script ) {
          this.idlers.push(gltf.scene);
        }
      } else
        gltf.scene.script = null;
      if( ischaracter ) {
        /*
        if( gltf.scene.children.length == 1 ) {
          var child = gltf.scene.children[0];
          child.position.set(0,0,0);
          console.log("Reset childish positioning");
        }
        */
      }
      gltf.scene.updateMatrixWorld();

      if( obj.objid in this.loader.objdats ) {
        var body = this.physics.ammoBody(gltf.scene,this.loader.objdats[obj.objid], ischaracter?1.0:0.0);
        if( ischaracter ) {
          //gltf.scene.rotation.reorder('YXZ');
          body.setAngularFactor( 0, 1, 0 );
          body.setFriction( 0.05 );
          body.setGravity( new Ammo.btVector3(0,0,0) );
          //body.setCollisionFlags( 2 );
          body.setActivationState( 4 );
        }
        this.physics.ammoAdd(gltf.scene);
      }

      if( !ischaracter ) {
        var box = this.physics.getBoxFor(gltf.scene);
        this.spatialidx.add( box, gltf.scene );
      }

      gltf.scene.traverse(function(node) {
        if( node.isMesh ) {
          if( this.environs.envmap != null ) {
            node.material.envMap = this.environs.envmap;
          }
          node.castShadow = true;
          node.receiveShadow = true;
        }
        if( node instanceof THREE.Light ) {
          this.util.castShadowsFrom(node,false);
        }
      }.bind(this));
      this.scene.add( gltf.scene );
      this.controls.addObject( gltf.scene );
      if( gltf.scene.script && 'onload' in gltf.scene.script )
        gltf.scene.script.onload(gltf.scene, objno);
      this.mapRender();
    }.bind(this), function(){}, function (error) {
      console.log("Error adding object: ", error);
    }.bind(this));
  };


  this.camera = null;
  this.scene = null;
  this.renderer = null;
  this.controls = null;
  this.loader = new GameLoader(this);

  this.mapRender = function()
  {
    if( this.renderer == null ) return;
    if( typeof window.statsObj != 'undefined' )
      window.statsObj.begin();
    this.renderer.render(this.scene,this.camera);
    if( typeof window.statsObj != 'undefined' )
      window.statsObj.end();
  };

  this.idle = function(elapsed)
  {
    var i;

    for( i=0; i<idlers.length; ++i ) {
      idlers[i](elapsed);
    }
  };

  this.click = function(mesh,objno)
  {
    if( mesh.script && 'click' in mesh.script )
      mesh.script.click(mesh,objno);
  };
  this.collision_end = function(obj1,mesh1,obj2,mesh2)
  {
    //! verify result.self == this.mychar
    var objno;

    if( mesh1 == this.mychar ) {
      objno = mesh2.myobj;
      this.collide_end(mesh2,objno);
    } else if( mesh2 == this.mychar ) {
      objno = mesh1.myobj;
      this.collide_end(mesh1,objno);
    }
  };
  this.collision = function(obj1,mesh1,obj2,mesh2)
  {
    //! verify result.self == this.mychar
    var objno;

    if( mesh1 == this.mychar ) {
      objno = mesh2.myobj;
      this.collide(mesh2,objno);
    } else if( mesh2 == this.mychar ) {
      objno = mesh1.myobj;
      this.collide(mesh1,objno);
    }
  };
  this.collide = function(mesh,objno)
  {
    if( mesh.script && 'collide' in mesh.script )
      mesh.script.collide(mesh,objno);
  };

  this.collide_end = function(mesh,objno)
  {
    if( mesh.script && 'collide_end' in mesh.script )
      mesh.script.collide_end(mesh,objno);
  };


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

  this.switchToVehicle = function(obj)
  {
    this.stopMovement();
    this.assignCharacter(obj);
  };

  this.tloader = new THREE.TextureLoader();

  this.lastUpdate = 0;
  this.mytargetangle = 0;
  this.updateFrame = function() {
    var now = new Date().getTime();
    var elapsed, n, v2, v3, v4;
    var mybody;

    if( this.lastUpdate == 0 ) {
      elapsed = 0;
    } else {
      elapsed = now - this.lastUpdate;
    }
    var fps = 60;
    var fpstime = 17;

    if( this.mychar != null ) {

      mybody = this.physics.getBodyOf(this.mychar);

      if( mybody !== false ) {
        // hovering
        // https://github.com/kripken/ammo.js/issues/213

        var height = 5.0;
        var track = this.mychar.position;

        var btFrom = new Ammo.btVector3(track.x, track.y-1.0, track.z);
        var btTo = new Ammo.btVector3(track.x, track.y-height, track.z);
        var hf = 1.00;

        var rcb = new Ammo.ClosestRayResultCallback(btFrom,btTo);
        this.world.rayTest(btFrom,btTo,rcb);

        v4 = mybody.getLinearVelocity();

        if( rcb.hasHit() ) {
          var dist = track.y - rcb.get_m_hitPointWorld().y();
          var force = hf * ( 1.0 - dist/height );
          if( force > 0.5 ) {
            console.log("Dist = " + dist + ", force = " + force);
            if( v4.y() < 2.5 )
              v4.setY( v4.y() + force );
          } else {
            //console.log("Steady");
            v4.setY( v4.y() * 0.5 );
          }
        } else {
          var force = -hf*0.5;
          console.log("Falling");
          if( v4.y() > -2.5 )
            v4.setY( v4.y() + force );
        }

        // drift correction

        if( v4.length() > 0.005 ) {
          v2 = new THREE.Vector3(v4.x(),v4.y(),v4.z());
          var qx = this.mychar.quaternion.clone();
          qx.invert();
          v2.applyQuaternion(qx);
          v2.x *= 0.2;
          v2.z *= 0.99;
          v2.applyQuaternion(this.mychar.quaternion);
          v4 = new Ammo.btVector3(v2.x,v2.y,v2.z);
        } else {
          v4.setValue(0,0,0);
        }

        if( this.pressing_up ) {
          v2 = new THREE.Vector3(0,0,0.2);
          v2.applyQuaternion( this.mychar.quaternion );
          v3 = new Ammo.btVector3(v2.x,v2.y,v2.z);
          v4 = v4.op_add(v3);
        }
        if( this.pressing_reverse ) {
          v2 = new THREE.Vector3(0,0,-0.2);
          v2.applyQuaternion( this.mychar.quaternion );
          v3 = new Ammo.btVector3(v2.x,v2.y,v2.z);
          v4 = v4.op_add(v3);
        }
        if( this.pressing_down ) {
          v4.setX( v4.x() * 0.9 );
          v4.setZ( v4.z() * 0.9 );
        }
        mybody.setLinearVelocity(v4);

        //var ang = new Ammo.btVector3(0,0,0);
        var ang = mybody.getAngularVelocity();
        var rotspeed = 1.0;
        if( this.pressing_left && this.pressing_right ) {
          //mybody = this.physics.getBodyOf(this.mychar);
          //mybody.setAngularVelocity( new Ammo.btVector3(0,0,0) );
          this.mytargetangle = this.mychar.rotation.y;
        } else if( this.pressing_left ) {
          this.mytargetangle = this.mychar.rotation.y + 0.5;
          rotspeed = 3.0;
        } else if( this.pressing_right ) {
          this.mytargetangle = this.mychar.rotation.y - 0.5;
          rotspeed = 3.0;
        }
        //if( this.mytargetangle > Math.PI ) this.mytargetangle -= Math.PI*2;
        //else if( this.mytargetangle < Math.PI ) this.mytargetangle += Math.PI*2;
        var angdiff = this.mytargetangle - this.mychar.rotation.y;
        if( angdiff > Math.PI ) angdiff -= 2*Math.PI;
        else if( angdiff < -Math.PI ) angdiff += 2*Math.PI;

        if( Math.abs(angdiff) > 0.25 ) {
          //console.log("AD " + angdiff + " of " + this.mychar.rotation.x + "," + this.mychar.rotation.y + "," + this.mychar.rotation.z + " to " + this.mytargetangle);
          var oldturn = ang.y()*0.2;
          var newturn = oldturn+(angdiff*rotspeed*0.8);
          var maxspeed = 6.0;
          if( newturn < -maxspeed ) newturn = -maxspeed;
          else if( newturn > maxspeed ) newturn = maxspeed;
          //if( newturn < 0 ) newturn = -rotspeed;
          //else newturn = rotspeed;
          ang.setY( newturn );
        } else {
          ang.setY( 0.0 );
        }

        mybody.setAngularVelocity( ang );
      }
    }

    this.particles.update(elapsed/1000);
    this.environs.update(elapsed);
    if( this.world != null ) {
      if( this.mychar != null && typeof this.mychar.body != 'undefined' ) {
        this.mychar.body.setGravity( new Ammo.btVector3(0,0,0) );
      }
      this.world.stepSimulation(elapsed/1000, 10);
      this.physics.ammoToWorld();
      this.controls.update();
      //this.threeammodebugger.update();
      this.mapRender();
    }
    this.lastUpdate = now;
    setTimeout(this.updateFrame.bind(this), fpstime);
  }
  this.rotateLeft = function(amount) {
    if( this.mychar == null ) return;
    this.mytargetangle = amount;
  };
  this.upd_timer = false;
  this.stopTimer = function()
  {
    if( this.upd_timer === false ) return;
    clearInterval(this.upd_timer);
    this.upd_timer=false;
  }
  setTimeout(this.updateFrame.bind(this),30);

  this.lastTime = 0;
  this.animate = function(now) {
    var elapsed, n, v2, v3, found;
    if( this.lastTime == 0 ) {
      elapsed = 0;
    } else {
      elapsed = now - this.lastTime;
    }

    this.lastTime = now;
    this.orbitint = requestAnimationFrame(this.animate.bind(this));
    //this.updateFrame();
    //this.mapRender();
  };


  this.stopMovement = function()
  {
    return;
  };


//  this.orbitint = setInterval( window.updGameOrbitals, 100 );
  this.orbitint = null;

  this.dispose = function()
  {
    if( this.orbitint != null )
      window.cancelAnimationFrame(this.orbitint);
    this.controls.deactivate();
  };

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

  this.buildCamera = function()
  {
    console.log("Updating camera");
    this.camera = new THREE.PerspectiveCamera( 45, e.clientWidth / e.clientHeight, 0.1, 10000 );
    this.camera.position.set( 0, 10, -20 );
    if( this.controls ) {
      this.controls.setCamera(this.camera);
      this.controls.zoom0 = 1;
      this.controls.reset();
      this.mapRender();
    }
  };

  this.updCamera = function()
  {
    var v3, v4;
    v3 = mychar.position.clone();
    //v3.copy(mychar.position);
    v4 = new THREE.Vector3(0,10,-5);
    v4.applyQuaternion(mychar.quaternion);
    v3.add(v4);
    this.camera.position.copy(v3);
    var box = this.physics.getBoxFor(this.mychar);
    var pos = new THREE.Vector3( (box.min.x+box.max.x)/2,
                                 (box.min.y+box.max.y)/2,
                                 (box.min.z+box.max.z)/2 );
    console.log("Box @ " + box.min.x + "," + box.min.y + "," + box.min.z + " - " + box.max.x + "," + box.max.y + "," + box.max.z);
    console.log("Pos = " + pos.x + "," + pos.y + "," + pos.z);
    this.camera.lookAt(pos);
    this.controls.reset();
  };

  this.world = this.ground = null;
  this.physics = new Physics(this);
  this.buildWorld = function()
  {
    this.physics.ammoStart();
    this.physics.makeGround();

    //this.threeammodebugger = new ThreeAmmoDebugger(this.scene, this.world);
    //this.threeammodebugger.enable();
  };

  this.buildPlayer = function()
  {
    var chc = getObjByName("CivHC");
    if( chc == null ) {
      console.log("No character");
      return;
    }
    var bld = { '_id': '', 'objid': chc._id, 'x': 0, 'y': 0, 'z': 0, 'rotX': 0, 'rotY': 0, 'rotZ': 0 };
    this.addObject(bld,true);
  };

  this.pressing_left = this.pressing_right = this.pressing_up = this.pressing_down = this.pressing_reverse = false;
  this.keyDown = function(ev)
  {
    switch( ev.keyCode ) {
      case 65: // left
        this.pressing_left=true;
        break;
      case 68: // right
        this.pressing_right=true;
        break;
      case 87: // up
        this.pressing_up=true;
        break;
      case 83: // down
        var n, found=false;
        if( this.pressing_down == true || this.pressing_reverse == true ) return;
        var tn = new Date().getTime();
        if( this.down_press_time != 0 && tn - this.down_press_time < 1000 ) return;
        var body = this.physics.getBodyOf(this.mychar);
        var vel;// = new Ammo.btVector3(0,0,0);
        vel = body.getLinearVelocity();
        var len = Math.sqrt( vel.x() * vel.x() + vel.z() * vel.z() );
        if( len > 0.001 ) {
          this.pressing_down = true;
          this.down_press_time = new Date().getTime();
        } else {
          this.pressing_reverse = true;
        }
        break;
    }
  }
  this.keyUp = function(ev)
  {
    switch( ev.keyCode ) {
      case 65: // left
        this.pressing_left=false;
        if( !this.pressing_right )
          this.mytargetangle = this.mychar.rotation.y;
        break;
      case 68: // right
        this.pressing_right=false;
        if( !this.pressing_left )
          this.mytargetangle = this.mychar.rotation.y;
        break;
      case 87: // up
        this.pressing_up=false;
        break;
      case 83: // down
        this.down_press_time = new Date().getTime();
        this.pressing_down = false;
        this.pressing_reverse = false;
        break;
    }
  }
  this.down_press_time = 0;

  this.renderer = new THREE.WebGLRenderer( { antialias: false } );
  this.renderer.setPixelRatio( window.devicePixelRatio );
  this.renderer.setSize( e.clientWidth, e.clientHeight );
  this.renderer.shadowMap.enabled = true;
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure = 0.25;
  this.renderer.outputEncoding = THREE.sRGBEncoding;
  e.appendChild( this.renderer.domElement );

  this.particles = new ParticleSystem(this);

  //this.createPointCloud(0.2, true, 0.1, true, 0xffffff);
  //this.createRain();
  this.environs = new Environs(this);
  this.environs.createClouds();
  this.environs.buildSkydome();
  this.buildWorld();
  this.buildCamera(false);
  this.buildPlayer();

  this.spatialidx = new SpatialIndex();
  this.spatialidx.init();


  this.controls = new FollowControls( this, [], this.camera, this.renderer.domElement, this.scene );
  this.controls.keyup = this.keyUp.bind(this);
  this.controls.keydown  = this.keyDown.bind(this);
  this.controls.change = this.mapRender.bind(this);
  this.controls.rotateleft = this.rotateLeft.bind(this);
  this.controls.update();

  this.loader.requestScript();
  this.loader.requestObjects(true);
  //window.requestAnimationFrame( this.animate.bind(this) );
}
