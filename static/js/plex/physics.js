var Physics = function(game)
{
  this.game = game;
  this.lastCollisionPoints = null;
  this.movingitems = [];

  this.cbodies = {};
  this.cmeshes = {};
  this.meshbodylookup = {};
  this.dispatch = null;

  this.ammoStart = function()
  {
    var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    this.dispatch= new Ammo.btCollisionDispatcher(collisionConfiguration);
    var overlappingPairCache = new Ammo.btDbvtBroadphase();
    var solver = new Ammo.btSequentialImpulseConstraintSolver();

    this.game.world           = new Ammo.btDiscreteDynamicsWorld(this.dispatch, overlappingPairCache, solver, collisionConfiguration);
    this.game.world.setGravity(new Ammo.btVector3(0, -10, 0));
  };


  this.ammo_index = 0;
  this.makeGround = function()
  {
    return;

    var objmass = 0.0;
    var quat = new Ammo.btQuaternion();
    quat.setEulerZYX(0,0,0);
    var pos = new Ammo.btVector3(0,0,0);
    var tr = new Ammo.btTransform( quat, pos );
    var box = new Ammo.btBoxShape( new Ammo.btVector3(500,0.5,500) );
    box.userid = this.ammo_index;
    this.ammo_index++;
    box.setMargin(0.05);

    var motionState = new Ammo.btDefaultMotionState( tr );

    var localInertia = new Ammo.btVector3( 0, 0, 0 );
    box.calculateLocalInertia( objmass, localInertia );

    var rbInfo = new Ammo.btRigidBodyConstructionInfo( objmass, motionState, box, localInertia );
    var body = new Ammo.btRigidBody( rbInfo );

    this.game.world.addRigidBody(body);

    return body;
  };

  this.shapemaps = {};

  this.ammoDebug = function(scene, objdata)
  {
    var i, j, od;
    var offset = new Ammo.btVector3(0,0,0);
    var gq = new THREE.Quaternion();
    var quat = new Ammo.btQuaternion();
    var geo, wire, mat, mesh, lines, bgeo;
    var tris;
    var grp = new THREE.Group();
    var odat;
    var omaps;

    if( scene.children.length == 1 ) {
      offset.setX(scene.children[0].position.x);
      offset.setY(scene.children[0].position.y);
      offset.setZ(scene.children[0].position.z);
    }

    var zquat = new Ammo.btQuaternion();
    var placement;
    var sclX, sclY, sclZ;
    var offset;
    var qmaps;

    for( i=0; i<objdata.length; ++i ) {
      od = objdata[i];
      odat = od.data;
      if( odat.sclX == '' || typeof odat.sclX == 'undefined' || isNaN(parseFloat(odat.sclX)) ) {
        sclX=sclY=sclZ=1;
      } else {
        sclX = parseFloat(odat.sclX);
        sclY = parseFloat(odat.sclY);
        sclZ = parseFloat(odat.sclZ);
      }
      omaps=[0,0,0];
      qmaps=[0,0,0];
      switch( od.type ) {
        case 1: // box:
          geo = new THREE.BoxBufferGeometry( odat.sz[0]*sclX, odat.sz[1]*sclY, odat.sz[2]*sclZ );

          qmaps = [
            odat.sz[3] + odat.sz[0]/2,
            odat.sz[4] + odat.sz[1]/2,
            odat.sz[5] + odat.sz[2]/2
          ];
          qmaps[0] *= sclX;
          qmaps[1] *= sclY;
          qmaps[2] *= sclZ;
          break;
        case 2: // sphere:
          break;
        case 3: // triangle mesh:
          geo = new THREE.BufferGeometry();
          tris = odat.tris;
          var k = 0, points = [], px = new Float32Array(tris.length);
          for( j=0; j<tris.length; j++ ) {
            if( j%3 == 0 ) {
              points.push(tris[j]*sclX);
            } else if( j%3 == 1 ) {
              points.push(tris[j]*sclY);
            } else if( j%3 == 2 ) {
              points.push(tris[j]*sclZ);
            }/*
            bgeo.vertices.push( new THREE.Vector3(tris[j]*sclX, tris[j+1]*sclY, tris[j+2]*sclZ) );
            if( k%3 == 2 )
              bgeo.faces.push( new THREE.Face3( k-2, k-1, k ) );
            k++;
            */
          }
          px.set(points);
          geo.setAttribute('position', new THREE.BufferAttribute(px, 3));
          break;
      }
      wire = new THREE.WireframeGeometry(geo);
      lines = new THREE.LineSegments(wire);
      lines.material.depthTest = false;
      lines.material.opacity = 0.25;
      lines.material.transparent = true;
      lines.position.set( odat.x+qmaps[0]+offset.x(), odat.y+qmaps[1]+offset.y(), odat.z+qmaps[2]+offset.z() );
      lines.rotation.set( odat.rotX, odat.rotY, odat.rotZ );
      grp.add(lines);
    }

    grp.position.set( scene.position.x, scene.position.y, scene.position.z );
    grp.rotation.set( scene.rotation.x, scene.rotation.y, scene.rotation.z );
    this.game.scene.add(grp);
  };

  this.ammoBody = function(scene, objdata, objmass)
  {
    this.ammoDebug(scene,objdata);
    var i, j, od;
    var offset = new Ammo.btVector3(0,0,0), off0 = new Ammo.btVector3(scene.position.x,scene.position.y,scene.position.z);
    var quat = new Ammo.btQuaternion();
    var gq = new THREE.Quaternion();
    gq.setFromEuler(scene.rotation);
    quat.setValue(gq.x, gq.y, gq.z, gq.w);

    if( scene.children.length == 1 ) {
      offset.setX(scene.children[0].position.x);
      offset.setY(scene.children[0].position.y);
      offset.setZ(scene.children[0].position.z);
    }

    var mainshape = new Ammo.btCompoundShape();
    var shapemap = [];
    var box, sph, odat;
    var map;
    var tr, triobj, tri, zquat = new Ammo.btQuaternion();
    var placement, mat4;
    var sclX, sclY, sclZ;

    for( i=0; i<objdata.length; ++i ) {
      od = objdata[i];
      odat = od.data;
      if( odat.sclX == '' || typeof odat.sclX == 'undefined' || isNaN(parseFloat(odat.sclX)) ) {
        sclX=sclY=sclZ=1;
      } else {
        sclX = parseFloat(odat.sclX);
        sclY = parseFloat(odat.sclY);
        sclZ = parseFloat(odat.sclZ);
      }
      switch( od.type ) {
        case 1: // box:
        var mmaps = [
          odat.sz[3] + odat.sz[0],
          odat.sz[4] + odat.sz[1],
          odat.sz[5] + odat.sz[2]
        ];
          map = { 'type': 'box',
            'obj': new THREE.Box3(
                    new THREE.Vector3(odat.sz[3]*sclX, odat.sz[4]*sclY, odat.sz[5]*sclZ),
                    new THREE.Vector3(mmaps[0]*sclX, mmaps[1]*sclY, mmaps[2]*sclZ)
                  ) };
          mat4 = new THREE.Matrix4();
          gq.setFromEuler(new THREE.Euler(odat.rotX,odat.rotY,odat.rotZ,'XYZ'));
          mat4.makeRotationFromQuaternion(gq);
          map.obj.applyMatrix4(mat4);
          map.obj.translate(new THREE.Vector3(odat.x,odat.y,odat.z));
          map.obj.translate(new THREE.Vector3(offset.x(),offset.y(),offset.z()));

          box = new Ammo.btBoxShape( new Ammo.btVector3(sclX*odat.sz[0]/2, sclY*odat.sz[1]/2, sclZ*odat.sz[2]/2) );
          box.setMargin(0.05);
          zquat.setValue(gq.x,gq.y,gq.z,gq.w);
          //zquat.setEulerZYX(odat.rotZ,odat.rotY,odat.rotX);
          var qmaps = [
            odat.sz[3] + odat.sz[0]/2,
            odat.sz[4] + odat.sz[1]/2,
            odat.sz[5] + odat.sz[2]/2
          ]
          placement = new Ammo.btVector3(odat.x+qmaps[0],odat.y+qmaps[1],odat.z+qmaps[2]);
          placement = placement.op_add(offset);
          tr = new Ammo.btTransform( zquat, placement );
          if( 'pname' in odat ) {
            map.name = odat.pname;
          } else {
            map.name = '';
          }
          shapemap.push(map);
          mainshape.addChildShape( tr, box );
          break;
        case 2: // sphere:
          map = { 'type': 'sph',
            'obj': new THREE.Sphere(
                    new THREE.Vector3(0,0,0),
                    odat.sz
                  ) };
          gq.setFromEuler(new THREE.Euler(odat.rotX,odat.rotY,odat.rotZ,'XYZ'));
          mat4 = new THREE.Matrix4();
          mat4.makeRotationFromQuaternion(gq);
          map.obj.applyMatrix4(mat4);
          map.obj.translate(new THREE.Vector3(odat.x,odat.y,odat.z));
          map.obj.translate(new THREE.Vector3(offset.x(),offset.y(),offset.z()));

          sph = new Ammo.btSphereShape( odat.sz );
          sph.setMargin(0.05);
          zquat.setValue(gq.x,gq.y,gq.z,gq.w);
          //zquat.setEulerZYX(odat.rotZ,odat.rotY,odat.rotX);
          placement = new Ammo.btVector3(odat.x,odat.y,odat.z);
          placement = placement.op_add(offset);
          tr = new Ammo.btTransform( zquat, placement );
          if( 'pname' in odat ) {
            map.name = odat.pname;
          } else {
            map.name = '';
          }
          shapemap.push(map);
          mainshape.addChildShape( tr, sph );
          break;
        case 3: // triangle mesh:
          map = { 'type': 'tri',
            'obj': null };
          gq.setFromEuler(new THREE.Euler(odat.rotX,odat.rotY,odat.rotZ,'XYZ'));

          tri = new Ammo.btTriangleMesh();
          var v1, v2, v3;

          v1 = new Ammo.btVector3();
          v2 = new Ammo.btVector3();
          v3 = new Ammo.btVector3();

          var tris = odat.tris;
          for( j=0; j<tris.length; j++ ) {
            switch( j % 3 ) {
              case 0:
                v1.setX(tris[j]*sclX);
                v1.setY(tris[j+1]*sclY);
                v1.setZ(tris[j+2]*sclZ);
                break;
              case 1:
                v2.setX(tris[j]*sclX);
                v2.setY(tris[j+1]*sclY);
                v2.setZ(tris[j+2]*sclZ);
                break;
              case 2:
                v3.setX(tris[j]*sclX);
                v3.setY(tris[j+1]*sclY);
                v3.setZ(tris[j+2]*sclZ);

                tri.addTriangle(v1,v2,v3);
                break;
            }
          }

          //tri.setMargin(0.05);
          zquat.setValue(gq.x,gq.y,gq.z,gq.w);
          //zquat.setEulerZYX(odat.rotZ,odat.rotY,odat.rotX);
          placement = new Ammo.btVector3(odat.x,odat.y,odat.z);
          placement = placement.op_add(offset);
//          placement += offset;
          tr = new Ammo.btTransform( zquat, placement );
          if( 'pname' in odat ) {
            map.name = odat.pname;
          } else {
            map.name = '';
          }

          shapemap.push(map);
          triobj = new Ammo.btBvhTriangleMeshShape(tri,true);
          mainshape.addChildShape( tr, triobj );
          break;
      }
    }

    mainshape.setMargin(0.05);

    this.shapemaps[this.ammo_index] = shapemap;

    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( off0 );
    transform.setRotation( quat );
    var motionState = new Ammo.btDefaultMotionState( transform );

    var localInertia = new Ammo.btVector3( 0, 0, 0 );
    mainshape.calculateLocalInertia( objmass, localInertia );

    var rbInfo = new Ammo.btRigidBodyConstructionInfo( objmass, motionState, mainshape, localInertia );
    scene.body = new Ammo.btRigidBody( rbInfo );
    scene.body.setUserIndex(this.ammo_index);
    this.ammo_index++;
    return scene.body;
  };

  this.getBodyOf = function(mesh)
  {
    if( mesh.id in this.cbodies )
      return this.cbodies[mesh.id];
    if( mesh.parent && mesh.parent.id in this.cbodies )
      return this.cbodies[mesh.parent.id];
    return false;
  };
  this.getMeshOf = function(body)
  {
    var bodyid = body.getUserIndex();
    var meshid = this.meshbodylookup[bodyid];
    if( meshid in this.cmeshes )
      return this.cmeshes[meshid];
    else
      return false;
  };
  this.getMapFor = function(body)
  {
    var bodyid = body.getUserIndex();
    if( bodyid in this.shapemaps )
      return this.shapemaps[bodyid];
    else
      return false;
  };

  this.ammoAdd = function(mesh)
  {
    var body = mesh.body;
    this.cmeshes[mesh.id] = mesh;
    this.cbodies[mesh.id] = body;
    this.meshbodylookup[ body.getUserIndex() ] = mesh.id;
//    body.oncollisionstart = this.game.collision.bind(this.game);
    this.game.world.addRigidBody(body);
    //this.game.threeammodebugger.update();
  };
  this.ammoRemove = function(mesh)
  {
    var body = mesh.body;
    delete this.cmeshes[mesh.id];
    delete this.cbodies[mesh.id];
    delete this.meshbodylookup[body.getUserIndex()];

    Ammo.destroy(mesh.body);
    mesh.body=null;
    //this.game.threeammodebugger.update();
  };

  this.collidingWith = {};
  // Sensors:
  // https://medium.com/@bluemagnificent/collision-detection-in-javascript-3d-physics-using-ammo-js-and-three-js-31a5569291ef

  this.ammoToWorld = function()
  {
    var i, mesh, body;
    const margin = 0.05;
    var i, dp = this.dispatch, num = dp.getNumManifolds();
    var manifold, num_contacts, j, pt;
    var rb0, rb1, co0, co1, sh0, sh1, shmap1, shmap2, mesh1, mesh2, n1, n2;
    var j, numContacts, cp, dist, pos1, pos2, tpos1, tpos2;
    var k, shm;
    var visits = {}, meshid;

    for (i = 0; i < num; i++) {
      manifold = dp.getManifoldByIndexInternal(i);

      rb0 = Ammo.castObject( manifold.getBody0(), Ammo.btRigidBody );
      rb1 = Ammo.castObject( manifold.getBody1(), Ammo.btRigidBody );

      co0 = Ammo.castObject( manifold.getBody0(), Ammo.btCollisionObject );
      co1 = Ammo.castObject( manifold.getBody1(), Ammo.btCollisionObject );

      sh0 = Ammo.castObject( co0.getCollisionShape(), Ammo.btCollisionShape );
      sh1 = Ammo.castObject( co1.getCollisionShape(), Ammo.btCollisionShape );

      mesh1 = this.getMeshOf(rb0);
      mesh2 = this.getMeshOf(rb1);
      shmap1 = this.getMapFor(rb0);
      shmap2 = this.getMapFor(rb1);
      n1 = rb0.getUserIndex();
      n2 = rb1.getUserIndex();

      if( mesh1 === false || mesh2 === false ) {
        // probably the ground!
        //console.log("Couldn't find a colliding mesh!");
        continue;
      }

      numContacts = manifold.getNumContacts();
      for ( j = 0; j < numContacts; j++ ) {
        cp = manifold.getContactPoint( j );
        dist = cp.getDistance();

        if( dist > 0.0 ) continue;
        if( n1 in visits && n2 in visits[n1] ) continue;
        if( !(n1 in visits) ) visits[n1] = {};
        if( !(n2 in visits) ) visits[n2] = {};
        visits[n1][n2] = true;
        visits[n2][n1] = true;
        if( n1 in this.collidingWith && n2 in this.collidingWith[n1] ) continue;
        if( !(n1 in this.collidingWith) ) this.collidingWith[n1] = {};
        if( !(n2 in this.collidingWith) ) this.collidingWith[n2] = {};
        this.collidingWith[n1][n2] = true;
        this.collidingWith[n2][n1] = true;

        pos1 = cp.get_m_localPointA();
        pos2 = cp.get_m_localPointB();
        tpos1 = new THREE.Vector3(pos1.x(), pos1.y(), pos1.z());
        tpos2 = new THREE.Vector3(pos2.x(), pos2.y(), pos2.z());

        for( k=0; k<shmap1.length; ++k ) {
          shm = shmap1[k].obj;
          if( shm == null ) continue;
          if( shm.distanceToPoint(tpos1) < margin ) {
            console.log("Found container shape 1");
          } else {
            console.log("Shape was dist=" + shm.distanceToPoint(tpos1));
          }
        }
        for( k=0; k<shmap2.length; ++k ) {
          shm = shmap2[k].obj;
          if( shm == null ) continue;
          if( shm.distanceToPoint(tpos2) < margin ) {
            console.log("Found container shape 2");
          }
        }

        this.game.collision(rb0,mesh1,rb1,mesh2);
      }
    }

    for( i in this.collidingWith ) {
      for( j in this.collidingWith[i] ) {
        if( i in visits && j in visits[i] ) continue;
        if( j in visits && i in visits[j] ) continue;

        meshid = this.meshbodylookup[i];
        mesh1 = this.cmeshes[meshid];
        rb0 = this.cbodies[meshid];

        meshid = this.meshbodylookup[j];
        mesh2 = this.cmeshes[meshid];
        rb1 = this.cbodies[meshid];

        this.game.collision_end(rb0,mesh1,rb1,mesh2);
        delete this.collidingWith[i][j];
      }
      if( Object.keys(this.collidingWith[i]).length == 0 )
        delete this.collidingWith[i];
    }

    for( i in this.cmeshes ) {
      mesh = this.cmeshes[i];
      body = this.cbodies[i];
      var ms = body.getMotionState();
      if( ms ) {
        var tr = new Ammo.btTransform();
        ms.getWorldTransform(tr);
        var pos = tr.getOrigin();
        var quat = tr.getRotation();
        mesh.position.set(pos.x(), pos.y(), pos.z());
        if( !isNaN(quat.x()) )
          mesh.quaternion.set(quat.x(), quat.y(), quat.z(), quat.w());
        mesh.updateMatrixWorld();
      }
    }
    this.game.controls.update();
  };

  this.ammoFromWorld = function(mesh)
  {
    var body = this.getBodyOf(mesh);
    body.position.setValue( mesh.position.x, mesh.position.y, mesh.position.z );
    body.quaternion.setX( mesh.quaternion.x );
    body.quaternion.setY( mesh.quaternion.y );
    body.quaternion.setZ( mesh.quaternion.z );
    body.quaternion.setW( mesh.quaternion.w );
    //this.game.threeammodebugger.update();
  };

  this.testCollides = function(obj1)
  {
    // do broad phase:
    var box = this.getBoxFor(obj1);
    var objs = this.game.spatialidx.search(box);
    var i;
    var body1,body2;
    body1 = this.cbodies[obj1.id];
    for( i=0; i<objs.length; ++i ) {
      if( objs[i] == obj1 ) continue;
      body2 = this.cbodies[objs[i].id];
      // do narrow phase:
      if( this.game.world.narrowphase.bodiesOverlap(body1,body2) )
        return true;
    }
    return false;
  };

  this.collider1 = function(a,b,aV)
  {
    let d = [b];
    let e = a.position.clone();
    let f = aV.length;
    let g = a.position;
    let h = a.matrix;
    let i = aV;
    var found = false;
    for (var vertexIndex = f-1; vertexIndex >= 0; vertexIndex--) {
      let localVertex = i[vertexIndex].clone();
      let globalVertex = localVertex.applyMatrix4(h);
      let directionVector = globalVertex.sub(g);

      let ray = new THREE.Raycaster(e,directionVector.clone().normalize());
      let collisionResults = ray.intersectObjects(d);
      var n;

      for( n=0; n<collisionResults.length; ++n ) {
        if ( collisionResults[n].distance < directionVector.length() ) {
          this.lastCollisionPoints.push(collisionResults[n].point);
          found=true;
          break;
        }
      }
      if( found ) break;
    }
    return found;
  };

//  this.collider2 = function(a,b,aV,bV)
//  {
//    return this.collider1(a,b,aV)||this.collider1(b,a,bV)||(a.position.z==b.position.z&&a.position.x==b.position.x&&a.position.y==b.position.y)
//  };
  this.collider2 = function(a,b,aV,bV)
  {
    return this.collider1(a,b,aV);//||this.collider1(b,a,bV)||(a.position.z==b.position.z&&a.position.x==b.position.x&&a.position.y==b.position.y)
  };

  this.collideBox = function(a,b)
  {
    //var box1 = new THREE.Box3().setFromObject(a);
    //var box2 = new THREE.Box3().setFromObject(b);
    //return box1.intersectsBox(box2);
    var box1,box2;
    if( !a.geometry || !b.geometry ) return false;
    if( a.geometry.boundingBox == null ) a.geometry.computeBoundingBox();
    if( b.geometry.boundingBox == null ) b.geometry.computeBoundingBox();
    box1 = a.geometry.boundingBox.clone().applyMatrix4( a.matrixWorld );
    box2 = b.geometry.boundingBox.clone().applyMatrix4( b.matrixWorld );
    return box1.intersectsBox( box2 );
  };
  this.collideSphere = function(a,b)
  {
    var sph1,sph2;
    if( !a.geometry || !b.geometry ) return false;
    if( a.geometry.boundingSphere == null ) a.geometry.computeBoundingSphere();
    if( b.geometry.boundingSphere == null ) b.geometry.computeBoundingSphere();
    sph1 = a.geometry.boundingSphere.clone();
    sph2 = b.geometry.boundingSphere.clone();
    sph1.translate( a.position );
    sph2.translate( b.position );
    return sph1.intersectsSphere( sph2 );
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

  this.collideList = function(obj,list,off_obj)
  {
    var i;
    var obj1, obj2, objs=[];
    var mesh1, mesh2;

    if( obj instanceof THREE.Group ) {
      for( i=0; i<obj.children.length; ++i ) {
        obj2 = this.collideList(obj.children[i], list, off_obj ? off_obj : obj);
        if( obj2.length != 0 ) {
          objs.push(...obj2);
          return objs;
        }
      }
      return objs;
    }
    if( typeof off_obj != 'undefined' )
      obj1 = off_obj;
    else
      obj1 = obj;
    mesh1 = this.getGeometryOf(obj);

    for( i=0; i<list.length; ++i ) {
      if( obj == list[i] ) {
        continue;
      }
      if( list[i].name == 'raindrops' )
        continue;
      if( list[i] instanceof THREE.Group ) {
        obj2 = this.collideList(obj, list[i].children, off_obj);
        if( obj2.length != 0 ) {
          objs.push(...obj2);
          return objs;
        }
        continue;
      }
      obj2 = list[i];
      //if( this.collideSphere(obj,obj2) ) {
        if( this.collideBox(obj,obj2) ) {
          mesh2 = this.getGeometryOf(obj2);

          if( this.collider2(obj1,obj2,mesh1,mesh2) ) {
            objs.push(obj2);
            return objs;
          }
        }
      //}
    }
    return objs;
  };

  this.spanBox = function(obj)
  {
    var box = new THREE.Box3().expandByObject(obj);
    return box;
  };

  this.getBoxFor = function(obj)
  {
    var box = new THREE.Box3().setFromObject(obj);
    return box;
  };

  this.alignedBox = function(obj)
  {
    if( obj.children.length == 1 )
      return this.alignedBox(obj.children[0]);
    if( obj.geometry.boundingBox == null ) obj.geometry.computeBoundingBox();
    var box = obj.geometry.boundingBox.clone();
    box.applyMatrix4(obj.matrixWorld);
    return box;
  }

  this.collider = function(obj)
  {
    var box = this.getBoxFor(obj);
    var objs = this.game.spatialidx.search(box);
    //var objs = this.controls.getObjects();
    return this.collideList(obj,objs);
  };

  this.testCollision = function(obj)
  {
    this.lastCollisionPoints = [];

    obj.updateMatrixWorld();
    var objs = this.collider(obj);
    if( objs.length > 0 ) {
      //console.log("Found collision");
      return true;
    }
    return false;
  };


};

export { Physics };
