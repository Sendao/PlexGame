import {
	EventDispatcher,
  MOUSE,
  Quaternion,
	Euler,
  Spherical,
  TOUCH,
	Matrix4,
	Plane,
	Raycaster,
	Vector2,
	Vector3,
	Box3,
	LineBasicMaterial,
	MeshBasicMaterial,
	TubeGeometry,
	BufferGeometry,
	Line,
	Mesh,
	TubeBufferGeometry,
	EllipseCurve,
	TorusBufferGeometry,
	CylinderBufferGeometry,
	MeshPhongMaterial
} from 'https://unpkg.com/three@0.123.0/build/three.module.js';

var FollowControls = function ( _game, _objects, _camera, _domElement, _scene ) {
	this.game = _game;
	var _raycaster = new Raycaster();
  this.keydown = null;
  this.keyup = null;
  this.change = null;
  this.rotateleft = null;

  this.rotateSpeed = 2.0 * Math.PI;

	this.activate = function() {
		_domElement.addEventListener( 'pointermove', this.onPointerMove.bind(this), false );
		_domElement.addEventListener( 'pointerdown', this.onPointerDown.bind(this), false );
		_domElement.addEventListener( 'pointerup', this.onPointerUp.bind(this), false );
		_domElement.addEventListener( 'pointerleave', this.onPointerUp.bind(this), false );
    _domElement.addEventListener( 'wheel', this.onMouseWheel.bind(this), false );
		document.documentElement.addEventListener( 'keydown', this.onKeyDown.bind(this), false );
		document.documentElement.addEventListener( 'keyup', this.onKeyUp.bind(this), false );
		//document.documentElement.addEventListener( 'keypress', onKeyPress, false );
	}

	this.deactivate = function() {
		_domElement.removeEventListener( 'pointermove', this.onPointerMove.bind(this), false );
		_domElement.removeEventListener( 'pointerdown', this.onPointerDown.bind(this), false );
		_domElement.removeEventListener( 'pointerup', this.onPointerUp.bind(this), false );
		_domElement.removeEventListener( 'pointerleave', this.onPointerUp.bind(this), false );
    _domElement.removeEventListener( 'wheel', this.onMouseWheel.bind(this), false );
		document.documentElement.removeEventListener( 'keydown', this.onKeyDown.bind(this), false );
		document.documentElement.removeEventListener( 'keyup', this.onKeyUp.bind(this), false );
		//document.documentElement.removeEventListener( 'keypress', onKeyPress, false );
		_domElement.style.cursor = '';
	}

	this.dispose = function() {
		deactivate();
	}

	this.getObjects = function() {
		return _objects;
	}
  this.addObject = function(obj) {
    _objects.push(obj);
  }
	this.delObject = function(obj) {
		var i;

		for( i=0; i<_objects.length; ++i ) {
			if( _objects[i] == obj ) {
				_objects.splice(i,1);
				break;
			}
		}
	}

	this.getRotationOf = function( obj ) {
		var e = new Euler();
		e.setFromQuaternion(obj.quaternion, 'YXZ' );
		this.leftAngle = e.y;
    if(this.locked)
      this.leftAngle = -0.25;
		return this.leftAngle;
	};

  ///////////// EVENTS
	this.onPointerDown = function( event ) {
		event.preventDefault();
		switch ( event.pointerType ) {
			case 'mouse':
			case 'pen':
				this.onMouseDown( event );
				break;
		}
	}

  this.mouseStart = null;
  this.rotStart = null;
  this.leftAngle = -0.25;
  this.locked = true;
	this.onMouseDown = function( event ) {
		_domElement.focus ? _domElement.focus() : window.focus();

    this.mouseStart = [ event.clientX, event.clientY ];
    /*
		if( this.game.mychar ) {
			this.leftAngle = this.game.mychar.rotation.y;
		}
    */
    this.rotStart = [ this.leftAngle, this.upangle ];
    this.mousedown = true;

		{
			var rect = _domElement.getBoundingClientRect();
			var intersections = [];
      var mouse = new Vector2();

			mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
			mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

			_raycaster.setFromCamera( mouse, _camera );
			_raycaster.intersectObjects( _objects, true, intersections );

			if( intersections.length > 0 ) {
				var opar, found=false;

				opar = intersections[0].object;
				while( opar.parent ) {
					if( typeof opar.myname != 'undefined' ) {
						found=true;
						break;
					}
					opar = opar.parent;
				}
				var n = parseInt(opar.myname);
				if( !found ) {
					console.log("not an object");
					return;
				}

				if( event.ctrlKey )
					switchToVehicle(opar,n);
				else
					this.game.click(opar,n);
			}
		}



  }
  // Todo: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
	this.onPointerMove = function( event ) {
		event.preventDefault();

    if( this.locked ) return;

		switch ( event.pointerType ) {
			case 'mouse':
			case 'pen':
				this.onMouseMove( event );
				break;
		}
	}

  this.mousedown = false;
	this.onMouseMove = function( event ) {
    if( !this.mousedown ) return;
    var mouseDiff = [0,0];
    mouseDiff[0] = (this.mouseStart[0] - event.clientX) / _domElement.clientHeight * this.rotateSpeed;
    mouseDiff[1] = (this.mouseStart[1] - event.clientY) / _domElement.clientHeight * this.rotateSpeed;
    this.leftAngle = this.rotStart[0]+mouseDiff[0];
    if( this.rotateleft != null )
      this.rotateleft(this.leftAngle);
    this.rotateUp(this.rotStart[1]+mouseDiff[1]);
  };

	this.onPointerUp = function( event ) {
		event.preventDefault();
		switch ( event.pointerType ) {
			case 'mouse':
			case 'pen':
				this.onMouseUp( event );
				break;
		}
	}

	this.onMouseUp = function( event ) {
    this.mousedown = false;
    this.mouseStart = this.rotStart = null;
	}

	this.onMouseWheel = function( event ) {
		event.preventDefault();
		event.stopPropagation();
    // event.deltaY <> 0
    this.scrollBy(event.deltaY);
	};
	this.onKeyUp = function( event ) {
    if( this.keyup != null )
      this.keyup(event);
	}
  this.onKeyDown = function( event ) {
    if( this.keydown != null )
      this.keydown(event);
  }

	this.onKeyPress = function( event ) {
		console.log("Keypress", event);
	};

  this.zoommin = 0.4;
  this.zoommax = 2.0;
  this.scrollBy = function( amount ) {
    this.zoom -= amount/1000.0;
    if( this.zoom < this.zoommin ) this.zoom = this.zoommin;
    if( this.zoom > this.zoommax ) this.zoom = this.zoommax;
    this.update();
  };

  this.minup = -0.75;
  this.maxup = 1.8;

  this.rotateUp = function( amount ) {
    if( amount < this.minup ) amount = this.minup;
    if( amount > this.maxup ) amount = this.maxup;
    this.upangle = amount;
    this.update();
  };

  this.upangle = 0.45;//0.14;
  this.zoom = 1.0;
  this.object = null;
  this.rotlocked = false;

  this.lastPosition = null;

  this.update = function(dochange=true) {
    var tgtPos, bar, objPos;
    var fixed_camera_speed = 0.15;
    var camerafactor = 8;
    var vx, vn;

    bar = new Vector3(0,10,-10);
    bar.applyAxisAngle(new Vector3(1,0,0), -this.upangle);

    // Calculate tgtPos as object_position
    if( this.object == null ) {
      tgtPos = new Vector3(0,0,0);
    } else {
			var box = this.game.physics.getBoxFor(this.object);
			tgtPos = new Vector3( (box.min.x+box.max.x)/2,
														 (box.min.y+box.max.y)/2,
														 (box.min.z+box.max.z)/2 );

      if( this.locked && this.rotlocked ) {
        bar.applyAxisAngle(new Vector3(0,1,0), this.leftAngle);
      } else {
        bar.applyQuaternion( this.object.quaternion );
      }
    }
		objPos = tgtPos.clone();
    tgtPos.add( bar );

    // Move camera toward tgtPos
    if( this.lastPosition != null ) {
      vx = this.lastPosition.clone();
      vn = tgtPos.clone();
      vn.sub(this.lastPosition);
      var dist = vn.length();
      vn.normalize();
      if( dist > fixed_camera_speed*camerafactor ) {
        fixed_camera_speed *= dist/2;
      }
      if( dist < fixed_camera_speed )
        fixed_camera_speed = dist;
      vn.multiplyScalar(fixed_camera_speed);
      vx.add(vn);
      tgtPos = vx;
    }
    _camera.position.copy( tgtPos );
    this.lastPosition = tgtPos;

    // Look at target
	 _camera.lookAt( objPos );

    _camera.zoom = this.zoom;
    _camera.updateProjectionMatrix();

//    if( this.change != null && dochange )
//      this.change();
  }

  this.activate();
};

export { FollowControls };
