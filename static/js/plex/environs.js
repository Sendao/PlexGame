import { Sky } from 'https://unpkg.com/three@0.123.0/examples/jsm/objects/Sky.js';

var Environs = function(game)
{
  this.game = game;
  this.clouds = null;
  this.cloudobj = null;
  this.windangle = null;
  this.inclemency = 0.01;
  this.cloud = null;
  this.rain = null;
  this.isnight = 0.0;
  this.lastPhase = 'none';

  var mysky=null, skyUniforms;
  var pmremGenerator;
  pmremGenerator = new THREE.PMREMGenerator( this.game.renderer );

  this.orbitals = [];
  this.update = function(elapsed)
  {
    var i, vel;
    var ang,cloud;
    var sat,grp;

    if( this.rain != null ) {
      var vertices = this.rain.geometry.vertices;
      //console.log("Update rain " + (elapsed/10) + " times " + vertices.length);
      vertices.forEach(function (v) {
          v.y = v.y - (v.velocityY);
          v.x = v.x - (v.velocityX);
          //console.log("Velocity: " + v.velocityX + "," + v.velocityY);

          if (v.y <= 0) v.y = 60;
          if (v.x <= -200 || v.x >= 200) v.velocityX = v.velocityX * -1;
      });
      this.rain.geometry.verticesNeedUpdate=true;
    }
    if( this.cloud != null ) {
      var vertices = this.cloud.geometry.vertices;
      //console.log("Update rain " + (elapsed/10) + " times " + vertices.length);
      vertices.forEach(function (v) {
          v.y = v.y - (v.velocityY);
          v.x = v.x - (v.velocityX);
          //console.log("Velocity: " + v.velocityX + "," + v.velocityY);

          if (v.y <= 0) v.y = 60;
          if (v.x <= -200 || v.x >= 200) v.velocityX = v.velocityX * -1;
      });
      this.cloud.geometry.verticesNeedUpdate=true;
    }

    // generate new clouds
    if( Math.random() > 0.995 ) {
      this.windangle += Math.random() * Math.PI/8 - Math.PI/16;
      if( this.windangle > Math.PI*2 ) this.windangle -= Math.PI*2;
      this.createCloud(this.windangle,1);
    }
    for( i=0; i<this.clouds.length; i+=3 ) {
      cloud = this.clouds[i];
      ang = this.clouds[i+1];
      vel = this.clouds[i+2];

      ang[0] += vel[0];
      ang[1] += vel[1];
      if( ang[0] < -Math.PI/2 || ang[0] > Math.PI/2 ) {
        this.cloudobj.remove( cloud );
        this.clouds.splice(i,3);
        i-=3;
        continue;
      }
      if( ang[1] < -Math.PI/2 || ang[1] > Math.PI/2 ) {
        this.cloudobj.remove( cloud );
        this.clouds.splice(i,3);
        i-=3;
        continue;
      }

      this.moveCloud(cloud, ang);
    }

    //console.log("orbit elapsed: " + elapsed);
    for( i=0; i<this.orbitals.length; ++i ) {
      sat = this.orbitals[i][0];
      grp = this.orbitals[i][2];
      this.orbitals[i][1] += elapsed * parseFloat(sat.speed)/500;
      if( this.orbitals[i][1] > Math.PI * 4 ) {
        this.orbitals[i][1] -= Math.PI * 4;
      }
      if( this.game.mychar ) {
        grp.position.copy( this.game.mychar.position );
      }
      grp.rotation.x = this.orbitals[i][1];
      if( sat.intensity == 1 ) {
        this.updSkydome(this.orbitals[i][1], sat.zangle*Math.PI/180, this.orbitals[i][3], this.orbitals[i][4]);
      }
    }
  };

  this.addOrbital = function(sat)
  {
    var grp, obj;

    grp = new THREE.Group();
    grp.name = 'orbital_group';
    grp.rotation.y = sat.zangle * Math.PI / 180;
    grp.rotation.x = 0;
    grp.rotation.z = 0;

    if( sat.intensity != 0 ) {
      obj = new THREE.DirectionalLight( eval(sat.color), parseFloat(sat.intensity) );
      obj.name = 'orbital_light';
      this.game.util.castShadowsFrom(obj,true);
      obj.position.set(0,0,-500);
      grp.add(obj);
      if( this.game.mainlight != null ) {
        this.game.scene.remove(this.game.mainlight);
        this.game.mainlight = null;
      }
    }

    var mydata = [sat,0,grp,obj];
    var obj2;
    if( sat.texture == '' || typeof sat.texture == 'undefined' ) {
      console.log("Create basic material sphere");
      var mat = new THREE.MeshBasicMaterial( { color: eval(sat.color), side: THREE.FrontSide } );
      obj2 = new THREE.Mesh(new THREE.SphereGeometry(sat.size, 30, 30), mat);
      obj2.position.set(0,0,-sat.distance);
      obj2.name = 'orbital_sphere';
      if( sat.intensity < 1 )
        grp.add(obj2);
      mydata.push(obj2);
      this.game.scene.add(grp);
      this.orbitals.push( mydata );
    } else {
      this.game.tloader.load(sat.texture, function(grp, texture) {
        console.log("Create textured material sphere");
        var geom,mat;
        var mat = new THREE.MeshBasicMaterial( { map: texture, side: THREE.FrontSide } );
        var obj2 = new THREE.Mesh(new THREE.SphereGeometry(sat.size, 30, 30), mat);
        obj2.position.set(0,0,-sat.distance);
        obj2.name = 'orbital_sphere';
        if( sat.intensity < 1 )
          grp.add(obj2);
        mydata.push(obj2);
        this.game.scene.add(grp);
        this.orbitals.push( mydata );
      }.bind(this,grp));
    }

    console.log("Built orbital");
  };

  this.windCompass = function(ang)
  {
    var x,y;
    y=Math.sin(ang);
    x=Math.cos(ang);
    return [x,y];
  };
  const cloud_vtxSh = [
    "varying vec2 vUv;",
    "void main() {",
    " vUv = uv;",
    " gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
    "}"
  ].join("\n");
  const cloud_fragSh = [
    "uniform sampler2D map;",
    "uniform vec3 fogColor;",
    "uniform float fogNear;",
    "uniform float fogFar;",
    "uniform float darkness;",
    "varying vec2 vUv;",
    "void main() {",
    "	float depth = gl_FragCoord.z / gl_FragCoord.w;",
    "	float fogFactor = smoothstep( fogNear, fogFar, depth );",
    "	gl_FragColor = texture2D( map, vUv );",
    " gl_FragColor.x /= darkness; gl_FragColor.y /= darkness; gl_FragColor.z /= darkness;",
    "	gl_FragColor.w *= pow( gl_FragCoord.z, 2.0 );",
    "	gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );",
    "}"
  ].join("\n");
  this.cloudtexture = this.game.tloader.load('/cloud10.png');
  this.moveCloud = function(mesh,ang)
  {
    mesh.position.y = ang[4];
    mesh.position.x = mesh.position.z = 0;
    mesh.position.applyAxisAngle(new THREE.Vector3(1,0,0), ang[0]);
    mesh.position.applyAxisAngle(new THREE.Vector3(0,0,1), ang[1]);
    mesh.position.applyAxisAngle(new THREE.Vector3(0,1,0), ang[2]);
    mesh.lookAt(new THREE.Vector3(0,0,0));
    mesh.rotation.z = ang[3];
    if( this.game.mychar ) {
      mesh.position.add(this.game.mychar.position);
    }
  }
  this.createCloud = function(windang,cloudcount,initplacement=false)
  {
    //view-source:https://mrdoob.com/lab/javascript/webgl/clouds/
    var texture = this.cloudtexture;
    texture.magFilter = THREE.LinearMipMapLinearFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    var fog = new THREE.Fog( /*0x4584b4*/0x101010, - 100, 3000 );
    var material = new THREE.ShaderMaterial( {
      uniforms: {
        "map": { type: "t", value: texture },
        "fogColor" : { type: "c", value: fog.color },
        "fogNear" : { type: "f", value: fog.near },
        "fogFar" : { type: "f", value: fog.far },
        "darkness": { type: "f", value: 2.0 + 8.0 * this.isnight }
      },
      vertexShader: cloud_vtxSh,
      fragmentShader: cloud_fragSh,
      depthWrite: false,
      depthTest: true,
      transparent: true,
      side: THREE.DoubleSide
    } );
    var windxy = this.windCompass(windang);

    for ( var i = 0; i < cloudcount; i++ ) {
      var mesh = new THREE.Mesh( new THREE.PlaneGeometry(64,64), material );
      mesh.scale.x = mesh.scale.y = Math.random() * Math.random() * 2.5 + 1.0;
      var xang,yang,zang;
      if( initplacement )
        xang = Math.random() * Math.PI - Math.PI/2;
      else
        xang = Math.PI/2;
      yang = Math.random() * Math.PI/4 - Math.PI/8;
      zang = -windang + Math.random() * Math.PI + Math.PI/2;
      var zrot = Math.random() * Math.PI;
      var zlevel = 300 + Math.random() * 10.0;
      this.moveCloud(mesh, [xang,yang,zang,zrot,zlevel]);

      mesh.name = 'cloud';
      this.cloudobj.add(mesh);
      this.clouds.push( mesh, [xang,yang,zang,zrot,zlevel], [Math.random() * 0.0005 - 0.00025, Math.random()*0.0001 - 0.00005] );
    }
  }

  this.createClouds = function()
  {
    this.clouds = [];
    this.cloudobj = new THREE.Group();
    this.windangle = Math.random() * 2*Math.PI;
    this.createCloud( this.windangle, 30, true );
		this.game.scene.add( this.cloudobj );
  };


  this.createRain = function()
  {
    var rainGeo = new THREE.Geometry();
    var i, rainDrop;

    for( i=0;i<1500;++i ) {
      rainDrop = new THREE.Vector3(
        Math.random() * 50 - 25,
        Math.random() * 60,
        Math.random() * 50 - 25
      );
      rainDrop.velocityY = 0.5 + Math.random() / 5;
      rainDrop.velocityX = (Math.random() - 0.5) / 8;

      rainGeo.vertices.push(rainDrop);
    }
    var rainMat = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.05,
      transparent: true
    });
    this.rain = new THREE.Points(rainGeo,rainMat);
    this.rain.name = 'raindrops';
    this.game.scene.add(this.rain);
  }

  this.createPointCloud = function(size, transparent, opacity, sizeAttenuation, color) {
    var texture = THREE.ImageUtils.loadTexture("/drop.png");
    var geom = new THREE.Geometry();

    var material = new THREE.ParticleBasicMaterial({
      size: size,
      transparent: transparent,
      //opacity: opacity,
      map: texture,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: sizeAttenuation,
      color: color
    });

    var range = 40;
    for (var i = 0; i < 1500; i++) {
      var particle = new THREE.Vector3(
              Math.random() * range - range / 2,
              Math.random() * range * 1.5,
              Math.random() * range - range / 2);
      particle.velocityY = 1.0 + Math.random() / 5;
      particle.velocityX = (Math.random() - 0.5) / 8;
      geom.vertices.push(particle);
    }

    this.cloud = new THREE.ParticleSystem(geom, material);
    this.cloud.sortParticles = true;

    this.game.scene.add(this.cloud);
  }



  this.buildSkydome = function()
  {
    var map = radVar("maps." + this.game.getMap());

    mysky = new Sky();
    mysky.name = 'skybox';
    mysky.scale.setScalar(750);

    skyUniforms = mysky.material.uniforms;

		skyUniforms[ 'turbidity' ].value = 2.0;
		skyUniforms[ 'rayleigh' ].value = 1.813;
		skyUniforms[ 'mieCoefficient' ].value = 0.004;
		skyUniforms[ 'mieDirectionalG' ].value = 0.9;

    this.game.scene.add(mysky);
  };

  this.updateEnvironment = function()
  {
    this.game.scene.traverse( function(node) {
      if( node.name == 'skybox' || node.name == 'orbital_sphere' || node.name == 'cloud' || node.name == 'raindrops' )
        return;
      if( node.isMesh ) {
        node.material.envMap = this.envmap;
        node.castShadow = true;
        node.receiveShadow = true;
      }
    }.bind(this));
  };

  this.updClouds = function(nightlevel)
  {
    var i, cloud, unis;

    if( nightlevel >= 0 )
      this.isnight = nightlevel;
    else if( nightlevel < 0 ) {
      this.isnight = nightlevel * -2;
    }
    for( i=0; i<this.clouds.length; i += 3 ) {
      cloud = this.clouds[i];
      unis = cloud.material.uniforms;
      unis['darkness'].value = 2.0 + ( 8.0 * nightlevel );
    }
  };

  this.currentPhase = function(sunAngle)
  {
    if( Math.sin(sunAngle) > Math.sin(0) ) {
      return 'day';
    } else if( Math.sin(sunAngle) > Math.sin(-Math.PI/6) ) {
      return 'twilight';
    } else {
      return 'night';
    }
  };

  this.updSkydome = function(sunAngle, sunAngle2, sunlight, sunsphere)
  {
    var phase	= this.currentPhase(sunAngle);
    var sunpos = new THREE.Vector3(0,0,-1);
    sunpos.applyAxisAngle( new THREE.Vector3(1,0,0), sunAngle );
    sunpos.applyAxisAngle( new THREE.Vector3(0,1,0), sunAngle2 );
    //console.log("Angles " + sunAngle + "," + sunAngle2);

    if( mysky == null ) return; // haven't loaded the sky yet
    //if( typeof sunsphere == 'undefined' ) return;

    mysky.material.uniforms[ 'sunPosition' ].value.copy( sunpos );
		this.envmap = pmremGenerator.fromScene( mysky ).texture;
    this.updateEnvironment();

    if( phase === 'day' ){
			//sunsphere.material.color.set("rgb(255,"+ (Math.floor(Math.sin(sunAngle)*200)+55) + "," + (Math.floor(Math.sin(sunAngle)*200)+5) +")");
      sunlight.color.set("rgb(255,"+ (Math.floor(Math.sin(sunAngle)*200)+55) + "," + (Math.floor(Math.sin(sunAngle)*200)) +")");
      //this.skyUni.topColor.value.set("rgb(0,120,255)");
      //this.skyUni.bottomColor.value.set("rgb(255,"+ (Math.floor(Math.sin(sunAngle)*200)+55) + "," + (Math.floor(Math.sin(sunAngle)*200)) +")");
      if( phase != this.lastPhase )
        this.updClouds(0);
    } else if( phase === 'twilight' ){
      sunlight.intensity = 1;
			//sunsphere.material.color.set("rgb(255,55,5)");
      sunlight.color.set("rgb(" + (255-Math.floor(Math.sin(sunAngle)*510*-1)) + "," + (55-Math.floor(Math.sin(sunAngle)*110*-1)) + ",0)");
      //this.skyUni.topColor.value.set("rgb(0," + (120-Math.floor(Math.sin(sunAngle)*240*-1)) + "," + (255-Math.floor(Math.sin(sunAngle)*510*-1)) +")");
      //this.skyUni.bottomColor.value.set("rgb(" + (255-Math.floor(Math.sin(sunAngle)*510*-1)) + "," + (55-Math.floor(Math.sin(sunAngle)*110*-1)) + ",0)");
      this.updClouds( Math.sin(sunAngle) );
    } else {
      sunlight.intensity	= 0;
      //this.skyUni.topColor.value.set('black')
      //this.skyUni.bottomColor.value.set('black');
      if( phase != this.lastPhase )
        this.updClouds( 1.0 );
    }
    this.lastPhase = phase;

    if( this.game.mychar != null ) {
      mysky.position.copy(this.game.mychar.position);
    }
  };

};

export { Environs };
