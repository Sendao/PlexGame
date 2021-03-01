import { OrbitControls } from 'https://unpkg.com/three@0.123.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.123.0/examples/jsm/loaders/GLTFLoader.js';

window.drawObject = function(e)
{
  var eid = e.id;
  var id = eid.substr(2);
  var i, found=false;
  for( i=0; i<objects.length; ++i ) {
    if( objects[i]._id == id ) {
      found=true;
      break;
    }
  }
  if( !found ) {
    alert("Error - object not found " + id);
    return;
  }
  var obj = objects[i];
  console.log("Id: " + id + ":",obj);

  var camera, scene, renderer;

  function objRender()
  {
    renderer.render(scene,camera);
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x232323);
  {
    const intensity = 5;
    const light = new THREE.AmbientLight( 0x404040, intensity ); // soft white light
    scene.add(light);
  }

  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set( 0, 500, 0 );
    scene.add(light);
  }

  console.log("Window presize: " + e.clientWidth + ", " + e.clientHeight);
  camera = new THREE.PerspectiveCamera( 45, e.clientWidth / e.clientHeight, 0.25, 1000 );
  camera.position.set( 0, 10, -10 );

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( e.clientWidth, e.clientHeight );
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.25;
  renderer.outputEncoding = THREE.sRGBEncoding;
  e.appendChild( renderer.domElement );

	var controls = new OrbitControls( camera, renderer.domElement );
	controls.addEventListener( 'change', objRender ); // use if there is no animation loop
	controls.minDistance = 0.1;
	controls.maxDistance = 100;
	controls.target.set( 0, 0, 0 );
	controls.update();

  objRender();

  var sceneobj = null;
  var loader = new GLTFLoader().setPath( "/plex/res?id=" + obj._id + "/" );
  loader.load( 'basis', function(gltf) {
    console.log("gltf load finished", gltf);
    scene.add( gltf.scene );
    sceneobj = gltf.scene;
    objRender();
    HtmlRequestGet('/plex/objdat',buildArgString({'id':obj._id}), loadedObjdata);
  });

  function loadedObjdata(data)
  {
    var i, j, k;
    console.log("Got objects: ", data);
    var od = JSON.parse(data);
    var objs = od.data.objs, obj;
    var odat;
    var geo, wire, mat, mesh, lines, bgeo;
    var tris, offset=[0,0,0];
    var sclX, sclY, sclZ;

    for( i=0; i<objs.length; ++i ) {
      obj = objs[i];
      odat = JSON.parse(obj.data);
      offset = [0,0,0];
      if( odat.sclX == '' || typeof odat.sclX == 'undefined' || isNaN(parseFloat(odat.sclX)) ) {
        sclX=sclY=sclZ=1;
      } else {
        sclX = parseFloat(odat.sclX);
        sclY = parseFloat(odat.sclY);
        sclZ = parseFloat(odat.sclZ);
      }
      switch( obj.type ) {
        case 1: // box
          geo = new THREE.BoxBufferGeometry( odat.sz[0]*sclX, odat.sz[1]*sclY, odat.sz[2]*sclZ );
          offset = [ odat.sz[3]+odat.sz[0]/2, odat.sz[4]+odat.sz[1]/2, odat.sz[5]+odat.sz[2]/2 ];
          offset[0] *= sclX;
          offset[1] *= sclY;
          offset[2] *= sclZ;
          break;
        case 2: // sphere
          geo = new THREE.SphereBufferGeometry( odat.sz );
          break;
        case 3: // tris
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
        default:
          continue;
      }

      wire = new THREE.WireframeGeometry(geo);
      lines = new THREE.LineSegments(wire);
      lines.material.depthTest = false;
      lines.material.opacity = 0.25;
      lines.material.transparent = true;
      lines.position.set( odat.x+offset[0], odat.y+offset[1], odat.z+offset[2] );
      if( sceneobj.children.length == 1 ) {
      //  lines.position.add( sceneobj.children[0].position );
      }

      lines.rotation.set( odat.rotX, odat.rotY, odat.rotZ );
      scene.add(lines);
      objRender();
    }
  }
}
