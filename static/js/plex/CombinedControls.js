import {
	EventDispatcher,
  MOUSE,
  Quaternion,
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
	MeshPhongMaterial,
	BoxHelper
} from 'https://unpkg.com/three@0.123.0/build/three.module.js';

var CombinedControls = function ( _objects, _camera, _domElement, _scene ) {

	var _plane = new Plane();
	var _raycaster = new Raycaster();

	var _mouse = new Vector2();
	var _offset = new Vector3();
	var _intersection = new Vector3();
	var _worldPosition = new Vector3();
	var _inverseMatrix = new Matrix4();
	var _intersections = [];

	var _selected = null, _hovered = null, _shiftKey = false, _ctrlKey = false, _altKey = false, _startpos = new Vector3();
	var _startquat = null;
	var selected_box = null;
	var lock2x = false, lock2y = false, lock2z = false;

	//

	var scope = this;

  this.object = _camera;
  this.domElement = _domElement;


	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the object orbits around
	this.target = new Vector3();

	// How far you can dolly in and out ( PerspectiveCamera only )
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// How far you can zoom in and out ( OrthographicCamera only )
	this.minZoom = 0;
	this.maxZoom = Infinity;

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	// How far you can orbit horizontally, upper and lower limits.
	// If set, the interval [ min, max ] must be a sub-interval of [ - 2 PI, 2 PI ], with ( max - min < 2 PI )
	this.minAzimuthAngle = - Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians

	// Set to true to enable damping (inertia)
	// If damping is enabled, you must call controls.update() in your animation loop
	this.enableDamping = false;
	this.dampingFactor = 0.05;

	// This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
	// Set to false to disable zooming
	this.enableZoom = true;
	this.zoomSpeed = 1.0;

	// Set to false to disable rotating
	this.enableRotate = true;
	this.rotateSpeed = 1.0;

	// Set to false to disable panning
	this.enablePan = true;
	this.panSpeed = 1.0;
	this.screenSpacePanning = true; // if false, pan orthogonal to world-space direction camera.up
	this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	// If auto-rotate is enabled, you must call controls.update() in your animation loop
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	// Set to false to disable use of the keys
	this.enableKeys = true;
	this.spacebar = false;

	// The four arrow keys
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

	// Mouse buttons
	this.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };

	// Touch fingers
	this.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

	// for reset
	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();
	this.zoom0 = this.object.zoom;

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };

	var STATE = {
		NONE: - 1,
		ROTATE: 0,
		DOLLY: 1,
		PAN: 2,
		TOUCH_ROTATE: 3,
		TOUCH_PAN: 4,
		TOUCH_DOLLY_PAN: 5,
		TOUCH_DOLLY_ROTATE: 6
	};

	var state = STATE.NONE;

	var EPS = 0.000001;

	// current position in spherical coordinates
	var spherical = new Spherical();
	var sphericalDelta = new Spherical();

	var scale = 1;
	var panOffset = new Vector3();
	var zoomChanged = false;

	var rotateStart = new Vector2();
	var rotateEnd = new Vector2();
	var rotateDelta = new Vector2();

	var panStart = new Vector2();
	var panEnd = new Vector2();
	var panDelta = new Vector2();

	var dollyStart = new Vector2();
	var dollyEnd = new Vector2();
	var dollyDelta = new Vector2();
	//
	// public methods
	//

	this.setCamera = function(c) {
		_camera = c;
		scope.object = _camera;
	};

	this.getPolarAngle = function () {

		return spherical.phi;

	};

	this.getAzimuthalAngle = function () {

		return spherical.theta;

	};

	this.saveState = function () {

		scope.target0.copy( scope.target );
		scope.position0.copy( scope.object.position );
		scope.zoom0 = scope.object.zoom;

	};

	this.reset = function () {

		scope.target.copy( scope.target0 );
		scope.object.position.copy( scope.position0 );
		scope.object.zoom = scope.zoom0;

		scope.object.updateProjectionMatrix();
		scope.dispatchEvent( changeEvent );

		scope.update();

		state = STATE.NONE;

	};

	// this method is exposed, but perhaps it would be better if we can make it private...
	this.update = function () {

		var offset = new Vector3();

		// so camera.up is the orbit axis
		var quat = new Quaternion().setFromUnitVectors( scope.object.up, new Vector3( 0, 1, 0 ) );
		var quatInverse = quat.clone().invert();

		var lastPosition = new Vector3();
		var lastQuaternion = new Quaternion();

		var twoPI = 2 * Math.PI;

		return function update() {

			var position = scope.object.position;

			offset.copy( position ).sub( scope.target );

			// rotate offset to "y-axis-is-up" space
			offset.applyQuaternion( quat );

			// angle from z-axis around y-axis
			spherical.setFromVector3( offset );

			if ( scope.autoRotate && state === STATE.NONE ) {

				rotateLeft( getAutoRotationAngle() );

			}

			if ( scope.enableDamping ) {

				spherical.theta += sphericalDelta.theta * scope.dampingFactor;
				spherical.phi += sphericalDelta.phi * scope.dampingFactor;

			} else {

				spherical.theta += sphericalDelta.theta;
				spherical.phi += sphericalDelta.phi;

			}

			// restrict theta to be between desired limits

			var min = scope.minAzimuthAngle;
			var max = scope.maxAzimuthAngle;

			if ( isFinite( min ) && isFinite( max ) ) {

				if ( min < - Math.PI ) min += twoPI; else if ( min > Math.PI ) min -= twoPI;

				if ( max < - Math.PI ) max += twoPI; else if ( max > Math.PI ) max -= twoPI;

				if ( min <= max ) {

					spherical.theta = Math.max( min, Math.min( max, spherical.theta ) );

				} else {

					spherical.theta = ( spherical.theta > ( min + max ) / 2 ) ?
						Math.max( min, spherical.theta ) :
						Math.min( max, spherical.theta );

				}

			}

			// restrict phi to be between desired limits
			spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );

			spherical.makeSafe();


			spherical.radius *= scale;

			// restrict radius to be between desired limits
			spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

			// move target to panned location

			if ( scope.enableDamping === true ) {

				scope.target.addScaledVector( panOffset, scope.dampingFactor );

			} else {

				scope.target.add( panOffset );

			}

			offset.setFromSpherical( spherical );

			// rotate offset back to "camera-up-vector-is-up" space
			offset.applyQuaternion( quatInverse );

			position.copy( scope.target ).add( offset );

			scope.object.lookAt( scope.target );

			if ( scope.enableDamping === true ) {

				sphericalDelta.theta *= ( 1 - scope.dampingFactor );
				sphericalDelta.phi *= ( 1 - scope.dampingFactor );

				panOffset.multiplyScalar( 1 - scope.dampingFactor );

			} else {

				sphericalDelta.set( 0, 0, 0 );

				panOffset.set( 0, 0, 0 );

			}

			scale = 1;

			// update condition is:
			// min(camera displacement, camera rotation in radians)^2 > EPS
			// using small-angle approximation cos(x/2) = 1 - x^2 / 8

			if ( zoomChanged ||
				lastPosition.distanceToSquared( scope.object.position ) > EPS ||
				8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

				scope.dispatchEvent( changeEvent );

				lastPosition.copy( scope.object.position );
				lastQuaternion.copy( scope.object.quaternion );
				zoomChanged = false;

				return true;

			}

			return false;

		};

	}();


	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow( 0.95, scope.zoomSpeed );

	}

	function rotateLeft( angle ) {

		sphericalDelta.theta -= angle;

	}

	function rotateUp( angle ) {

		sphericalDelta.phi -= angle;

	}

	var panLeft = function () {

		var v = new Vector3();

		return function panLeft( distance, objectMatrix ) {

			v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix
			v.multiplyScalar( - distance );

			panOffset.add( v );

		};

	}();

	var panUp = function () {

  	var v = new Vector3();

  	return function panUp( distance, objectMatrix ) {

  		if ( scope.screenSpacePanning === true ) {

  			v.setFromMatrixColumn( objectMatrix, 1 );

  		} else {

  			v.setFromMatrixColumn( objectMatrix, 0 );
  			v.crossVectors( scope.object.up, v );

  		}

  		v.multiplyScalar( distance );

  		panOffset.add( v );

  	};

  }();

  // deltaX and deltaY are in pixels; right and down are positive
  var pan = function () {

  	var offset = new Vector3();

  	return function pan( deltaX, deltaY ) {

  		var element = scope.domElement;

  		if ( scope.object.isPerspectiveCamera ) {

  			// perspective
  			var position = scope.object.position;
  			offset.copy( position ).sub( scope.target );
  			var targetDistance = offset.length();

  			// half of the fov is center to top of screen
  			targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

  			// we use only clientHeight here so aspect ratio does not distort speed
  			panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
  			panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );

  		} else if ( scope.object.isOrthographicCamera ) {

  			// orthographic
  			panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
  			panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );

  		} else {

  			// camera neither orthographic nor perspective
  			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
  			scope.enablePan = false;

  		}

  	};

  }();

  function dollyOut( dollyScale ) {

  	if ( scope.object.isPerspectiveCamera ) {

  		scale /= dollyScale;

  	} else if ( scope.object.isOrthographicCamera ) {

  		scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
  		scope.object.updateProjectionMatrix();
  		zoomChanged = true;

  	} else {

  		console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
  		scope.enableZoom = false;

  	}

  }

  function dollyIn( dollyScale ) {

  	if ( scope.object.isPerspectiveCamera ) {

  		scale *= dollyScale;

  	} else if ( scope.object.isOrthographicCamera ) {

  		scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
  		scope.object.updateProjectionMatrix();
  		zoomChanged = true;

  	} else {

  		console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
  		scope.enableZoom = false;

  	}

  }

	function activate() {

		_domElement.addEventListener( 'pointermove', onPointerMove, false );
		_domElement.addEventListener( 'pointerdown', onPointerDown, false );
		_domElement.addEventListener( 'pointerup', onPointerCancel, false );
		_domElement.addEventListener( 'pointerleave', onPointerCancel, false );
		_domElement.addEventListener( 'touchmove', onTouchMove, false );
		_domElement.addEventListener( 'touchstart', onTouchStart, false );
		_domElement.addEventListener( 'touchend', onTouchEnd, false );

    _domElement.addEventListener( 'contextmenu', onContextMenu, false );
    _domElement.addEventListener( 'wheel', onMouseWheel, false );
		document.documentElement.addEventListener( 'keydown', onKeyDown, false );
		document.documentElement.addEventListener( 'keyup', onKeyUp, false );
		document.documentElement.addEventListener( 'keypress', onKeyPress, false );

	}

	function deactivate() {

		_domElement.removeEventListener( 'pointermove', onPointerMove, false );
		_domElement.removeEventListener( 'pointerdown', onPointerDown, false );
		_domElement.removeEventListener( 'pointerup', onPointerCancel, false );
		_domElement.removeEventListener( 'pointerleave', onPointerCancel, false );
		_domElement.removeEventListener( 'touchmove', onTouchMove, false );
		_domElement.removeEventListener( 'touchstart', onTouchStart, false );
		_domElement.removeEventListener( 'touchend', onTouchEnd, false );

    _domElement.removeEventListener( 'contextmenu', onContextMenu, false );
    _domElement.removeEventListener( 'wheel', onMouseWheel, false );
		document.documentElement.removeEventListener( 'keydown', onKeyDown, false );
		document.documentElement.removeEventListener( 'keyup', onKeyUp, false );
		document.documentElement.removeEventListener( 'keypress', onKeyPress, false );

		_domElement.style.cursor = '';
	}

	function dispose() {
		deactivate();
	}

	function getObjects() {
		return _objects;
	}
  function addObject(obj) {
    _objects.push(obj);
  }
	function delObject(obj) {
		var i;

		if( obj == _selected ) {
			if( _selected == null ) { console.log("Invalid delObject"); }
			_selected = null;
			scope.clearCursor();
			radClear("selectedobj");
		}

		for( i=0; i<_objects.length; ++i ) {
			if( _objects[i] == obj ) {
				_objects.splice(i,1);
				break;
			}
		}
	}

	//
	// event callbacks - update the object state
	//

	function handleMouseDownRotate( event ) {
		rotateStart.set( event.clientX, event.clientY );
	}

	function handleMouseDownDolly( event ) {
		dollyStart.set( event.clientX, event.clientY );
	}

	function handleMouseDownPan( event ) {
		panStart.set( event.clientX, event.clientY );
	}

	function handleMouseMoveRotate( event ) {
		rotateEnd.set( event.clientX, event.clientY );

		rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );

		var element = scope.domElement;

		rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

		rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

		rotateStart.copy( rotateEnd );

		scope.update();
	}

	function handleMouseMoveDolly( event ) {
		dollyEnd.set( event.clientX, event.clientY );
		dollyDelta.subVectors( dollyEnd, dollyStart );

		if ( dollyDelta.y > 0 ) {
			dollyOut( getZoomScale() );
		} else if ( dollyDelta.y < 0 ) {
			dollyIn( getZoomScale() );
		}
		dollyStart.copy( dollyEnd );
		scope.update();
	}

	function handleMouseMovePan( event ) {
		panEnd.set( event.clientX, event.clientY );
		panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );
		pan( panDelta.x, panDelta.y );
		panStart.copy( panEnd );
		scope.update();
	}

	function handleMouseWheel( event ) {
		if ( event.deltaY < 0 ) {
			dollyIn( getZoomScale() );
		} else if ( event.deltaY > 0 ) {
			dollyOut( getZoomScale() );
		}
		scope.update();
	}

	function handleKeyUp( event ) {
		switch( event.keyCode ) {
			default:
				//console.log("keyUp " + event.keyCode);
				break;
			case 32: // spacebar
				scope.spacebar=false;
				break;
		}

	}

	function handleKeyDown( event ) {

		var needsUpdate = false;

		switch ( event.keyCode ) {
			default:
				//console.log("keyCode " + event.keyCode);
				break;
			case 32:
				scope.spacebar=true;
				break;
			case scope.keys.UP:
				pan( 0, scope.keyPanSpeed );
				needsUpdate = true;
				break;
			case scope.keys.BOTTOM:
				pan( 0, - scope.keyPanSpeed );
				needsUpdate = true;
				break;
			case scope.keys.LEFT:
				pan( scope.keyPanSpeed, 0 );
				needsUpdate = true;
				break;
			case scope.keys.RIGHT:
				pan( - scope.keyPanSpeed, 0 );
				needsUpdate = true;
				break;

		}

		if ( needsUpdate ) {
			event.preventDefault();// prevent the browser from scrolling on cursor keys
			scope.update();
		}
	}

	function handleTouchStartRotate( event ) {

		if ( event.touches.length == 1 ) {

			rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

		} else {

			var x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
			var y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );

			rotateStart.set( x, y );

		}

	}

	function handleTouchStartPan( event ) {

		if ( event.touches.length == 1 ) {

			panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

		} else {

			var x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
			var y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );

			panStart.set( x, y );

		}

	}

	function handleTouchStartDolly( event ) {

		var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
		var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

		var distance = Math.sqrt( dx * dx + dy * dy );

		dollyStart.set( 0, distance );

	}

	function handleTouchStartDollyPan( event ) {

		if ( scope.enableZoom ) handleTouchStartDolly( event );

		if ( scope.enablePan ) handleTouchStartPan( event );

	}

	function handleTouchStartDollyRotate( event ) {

		if ( scope.enableZoom ) handleTouchStartDolly( event );

		if ( scope.enableRotate ) handleTouchStartRotate( event );

	}

	function handleTouchMoveRotate( event ) {

		if ( event.touches.length == 1 ) {

			rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

		} else {

			var x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
			var y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );

			rotateEnd.set( x, y );

		}

		rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );

		var element = scope.domElement;

		rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

		rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

		rotateStart.copy( rotateEnd );

	}

	function handleTouchMovePan( event ) {

		if ( event.touches.length == 1 ) {

			panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

		} else {

			var x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
			var y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );

			panEnd.set( x, y );

		}

		panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );

		pan( panDelta.x, panDelta.y );

		panStart.copy( panEnd );

	}

	function handleTouchMoveDolly( event ) {

		var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
		var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

		var distance = Math.sqrt( dx * dx + dy * dy );

		dollyEnd.set( 0, distance );

		dollyDelta.set( 0, Math.pow( dollyEnd.y / dollyStart.y, scope.zoomSpeed ) );

		dollyOut( dollyDelta.y );

		dollyStart.copy( dollyEnd );

	}

	function handleTouchMoveDollyPan( event ) {

		if ( scope.enableZoom ) handleTouchMoveDolly( event );

		if ( scope.enablePan ) handleTouchMovePan( event );

	}

	function handleTouchMoveDollyRotate( event ) {

		if ( scope.enableZoom ) handleTouchMoveDolly( event );

		if ( scope.enableRotate ) handleTouchMoveRotate( event );

	}

	function handleTouchEnd( /*event*/ ) {

		// no-op

	}


  var cursor_blue_line = null;
  var cursor_blue_arrow = null;
	var cursor_blue_circle = null;
  var cursor_red_line = null;
  var cursor_red_arrow = null;
	var cursor_red_circle = null;
  var cursor_green_line = null;
  var cursor_green_arrow = null;
	var cursor_green_circle = null;
	var cursor_box = null;
  var cursor_length = false;
  this.moveCursorTo = function(pos)
  {
    cursor_blue_line.position.copy(pos);
		cursor_blue_circle.position.copy(pos);
    cursor_red_line.position.copy(pos);
		cursor_red_circle.position.copy(pos);
    cursor_green_line.position.copy(pos);
		cursor_green_circle.position.copy(pos);
		if( cursor_box != null )
			cursor_box.update();
  };
	this.clearCursor = function()
	{
		if( cursor_blue_circle != null ) {
			_scene.remove( cursor_blue_line );
			_scene.remove( cursor_blue_circle );
			_scene.remove( cursor_red_line );
			_scene.remove( cursor_red_circle );
			_scene.remove( cursor_green_line );
			_scene.remove( cursor_green_circle );
			if( cursor_box != null )
				_scene.remove( cursor_box );
			this.delObject( cursor_blue_line );
			this.delObject( cursor_blue_circle );
			this.delObject( cursor_red_line );
			this.delObject( cursor_red_circle );
			this.delObject( cursor_green_line );
			this.delObject( cursor_green_circle );
			cursor_box=null;
			cursor_blue_circle=null;
			cursor_length = false;
		}
	};

  this.getGeometryBox = function(box, obj)
  {
    var i;

    if( 'geometry' in obj ) {
      if( obj.geometry.boundingBox == null ) obj.geometry.computeBoundingBox();
      box.expandByPoint(obj.geometry.boundingBox.min);
      box.expandByPoint(obj.geometry.boundingBox.max);
      return;
    }

    for( i=0; i<obj.children.length; ++i ) {
      this.getGeometryBox(box, obj.children[i]);
    }
  };

  this.drawCursorAt = function(pos, length)
  {
    if( cursor_length == length ) {
      scope.moveCursorTo(pos);
      return;
    } else if( cursor_blue_line != null ) {
			scope.clearCursor();
    }
		const linesize = 0.03;
		var mat,geom,pts;
		geom = new CylinderBufferGeometry( linesize, linesize, length, 8, 2 );
		mat = new MeshBasicMaterial( {color: 0x0000ff} );
		cursor_blue_line = new Mesh( geom, mat );
		cursor_blue_line.name = 'lblue';
		cursor_blue_line.position.copy(pos);
		cursor_blue_line.rotateOnAxis(new Vector3(1,0,0),Math.PI/2);
    _scene.add(cursor_blue_line);
		scope.addObject(cursor_blue_line);

		console.log("Cursor length is " + length);

		geom = new TorusBufferGeometry( length/2, linesize, 8, 16 );
		mat = new MeshPhongMaterial( { color: 0x0000ff, opacity: 0.5, transparent: true } );
		cursor_blue_circle = new Mesh( geom, mat );
		cursor_blue_circle.position.copy(pos);
		cursor_blue_circle.name = 'cblue';
		_scene.add(cursor_blue_circle);
		scope.addObject(cursor_blue_circle);

		geom = new CylinderBufferGeometry( linesize, linesize, length, 8, 2 );
		mat = new MeshPhongMaterial( {color: 0x00ff00, opacity: 0.5, transparent: true } );
		cursor_green_line = new Mesh( geom, mat );
		cursor_green_line.name = 'lgreen';
    _scene.add(cursor_green_line);
		scope.addObject(cursor_green_line);
		cursor_green_line.position.copy(pos);

		geom = new TorusBufferGeometry( length/2, linesize, 8, 16 );
		mat = new MeshPhongMaterial( { color: 0x00ff00, opacity: 0.5, transparent: true } );
		cursor_green_circle = new Mesh( geom, mat );
		cursor_green_circle.name = 'cgreen';
		cursor_green_circle.position.copy(pos);
		cursor_green_circle.rotateOnAxis(new Vector3(1,0,0),Math.PI/2);
		_scene.add(cursor_green_circle);
		scope.addObject(cursor_green_circle);

		geom = new CylinderBufferGeometry( linesize, linesize, length, 8, 2 );
		mat = new MeshPhongMaterial( {color: 0xff0000, opacity: 0.5, transparent: true } );
		cursor_red_line = new Mesh( geom, mat );
		cursor_red_line.name = 'lred';
		cursor_red_line.position.copy(pos);
		cursor_red_line.rotateOnAxis(new Vector3(0,0,1),-Math.PI/2);
    _scene.add(cursor_red_line);
		scope.addObject(cursor_red_line);

		geom = new TorusBufferGeometry( length/2, linesize, 8, 16 );
		mat = new MeshPhongMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
		cursor_red_circle = new Mesh( geom, mat );
		cursor_red_circle.name = 'cred';
		cursor_red_circle.position.copy(pos);
		cursor_red_circle.rotateOnAxis(new Vector3(0,1,0),Math.PI/2);
		_scene.add(cursor_red_circle);
		scope.addObject(cursor_red_circle);

		if( _selected ) {
			var box = new BoxHelper(_selected,0xffff00);
			box.name = 'selbox';
			_scene.add(box);
			cursor_box = box;
		}

  };

/* Events for moving objects */

	var clicking_blue_circle=false, clicking_red_circle=false, clicking_green_circle=false;
	var mouseAngleStart, itemAngleStart;

  function handleMouseMoveObject( event ) {
		var rect = _domElement.getBoundingClientRect();
		var mouseAngle;

		_mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
		_mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

		_raycaster.setFromCamera( _mouse, _camera );

		if ( _selected && scope.enabled ) {

			if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
				var j = new Vector3().copy( _startpos );

				if( _altKey ) {
					var scale1,scale2;
					j.copy(_intersection.sub(_startpos));
					if( _ctrlKey ) {
						// resize on xy plane
						scale1 = Math.abs( j.x );
						scale2 = Math.abs( j.y );
						// compute size relative to 1-scale box
						scale1 /= ( selected_box.max.x - selected_box.min.x );
						scale2 /= ( selected_box.max.y - selected_box.min.y );
						_selected.scale.x = scale1;
						_selected.scale.y = scale2;
					} else {
						scale1 = Math.abs( j.x );
						scale2 = Math.abs( j.z );
						// compute size relative to 1-scale box
						scale1 /= ( selected_box.max.x - selected_box.min.x );
						scale2 /= ( selected_box.max.z - selected_box.min.z );
						_selected.scale.x = scale1;
						_selected.scale.z = scale2;
					}
				} else {
					_selected.position.copy( j.add(_intersection.sub( _offset )) );
					if( !_ctrlKey ) {
						_selected.position.y = _startpos.y;
					} else {
						_selected.position.z = _startpos.z;
					}
				}
				scope.moveCursorTo( _selected.position );
			}

			scope.dispatchEvent( { type: 'drag', object: _selected } );
			scope.dispatchEvent( changeEvent );
			return;

		}
	}

  function handleMouseMoveCircle( event ) {
		var rect = _domElement.getBoundingClientRect();
		var mouseAngle, ang;
		var s2g = document.forms['ctrl'].snaptogrid.checked;

		_mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
		_mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

		_raycaster.setFromCamera( _mouse, _camera );

		if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
			if( clicking_blue_circle ) {
				_intersection.sub( _selected.position );
				mouseAngle = Math.atan2( _intersection.y, _intersection.x );
				ang = mouseAngle - mouseAngleStart;
				if( s2g )
					ang = roundBy(ang,Math.PI/4);
				_selected.quaternion.copy(_startquat);
				_selected.rotateOnWorldAxis(new Vector3(0,0,1), ang);
			} else if( clicking_green_circle ) {
				_intersection.sub( _selected.position );
				mouseAngle = Math.atan2( _intersection.z, _intersection.x );
				ang = mouseAngleStart - mouseAngle;
				if( s2g )
					ang = roundBy(ang,Math.PI/4);
				_selected.quaternion.copy(_startquat);
				_selected.rotateOnWorldAxis(new Vector3(0,1,0), ang);
			} else if( clicking_red_circle ) {
				_intersection.sub( _selected.position );
				mouseAngle = Math.atan2( _intersection.y, _intersection.z );
				ang = mouseAngleStart - mouseAngle;
				if( s2g )
					ang = roundBy(ang,Math.PI/4);
				_selected.quaternion.copy(_startquat);
				_selected.rotateOnWorldAxis(new Vector3(1,0,0), ang);
			}

			scope.dispatchEvent( { type: 'drag', object: _selected } );
			scope.dispatchEvent( changeEvent );
			return;
		}
	}

  function handleMouseMoveLine( event ) {
		var rect = _domElement.getBoundingClientRect();
		var mouseAngle;

		_mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
		_mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

		_raycaster.setFromCamera( _mouse, _camera );

		if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
			if( lock2z ) {
				mouseAngle = _intersection.z;
				_selected.position.z = itemAngleStart + ( mouseAngle - mouseAngleStart );
				scope.moveCursorTo(_selected.position);
			} else if( lock2y ) {
				mouseAngle = _intersection.y;
				_selected.position.y = itemAngleStart + ( mouseAngle - mouseAngleStart );
				scope.moveCursorTo(_selected.position);
			} else if( lock2x ) {
				mouseAngle = _intersection.x;
				_selected.position.x = itemAngleStart + ( mouseAngle - mouseAngleStart );
				scope.moveCursorTo(_selected.position);
			}

			scope.dispatchEvent( { type: 'drag', object: _selected } );
			scope.dispatchEvent( changeEvent );
			return;
		}
	}


	function onPointerMove( event ) {

		event.preventDefault();

		switch ( event.pointerType ) {

			case 'mouse':
			case 'pen':
				onMouseMove( event );
				break;

			// TODO touch

		}

	}

	function onMouseMove( event ) {
    if( moving && _selected ) {
      handleMouseMoveObject(event);
    } else if( clicking_blue_circle || clicking_red_circle || clicking_green_circle ) {
			handleMouseMoveCircle(event);
		} else if( lock2x || lock2y || lock2z ) {
			handleMouseMoveLine(event);
		} else {
      if ( scope.enabled === false ) return;
  		switch ( state ) {
  			case STATE.ROTATE:
  				if ( scope.enableRotate === false ) return;
  				handleMouseMoveRotate( event );
  				break;
  			case STATE.DOLLY:
  				if ( scope.enableZoom === false ) return;
  				handleMouseMoveDolly( event );
  				break;
  			case STATE.PAN:
  				if ( scope.enablePan === false ) return;
  				handleMouseMovePan( event );
  				break;
  		}
    }
  }

	function onPointerDown( event ) {

		event.preventDefault();

		switch ( event.pointerType ) {

			case 'mouse':
			case 'pen':
				onMouseDown( event );
				break;

			// TODO touch

		}

	}

	function onMouseDown( event ) {
		var rect = _domElement.getBoundingClientRect();
    _intersections.length = 0;

		_mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
		_mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

		if( scope.spacebar == false ) {
			_raycaster.setFromCamera( _mouse, _camera );
			_raycaster.intersectObjects( _objects, true, _intersections );
		}

		if ( _intersections.length > 0 ) {

			var obj, opar, found=false;

			opar = obj = _intersections[0].object;
			while( opar.parent ) {
				if( opar.name == 'cblue' || opar.name == 'cgreen' || opar.name == 'cred' ) {
					found=true;
					break;
				}
				if( opar.name == 'lblue' || opar.name == 'lgreen' || opar.name == 'lred' ) {
					found=true;
					break;
				}
				if( typeof opar.myname != 'undefined' ) {
					found=true;
					break;
				}
				opar = opar.parent;
			}
			var n = parseInt(opar.myname);
			if( !found ) {
				console.log("not an object");
			}
			if( isNaN(n) ) {
				clicking_red_circle = clicking_blue_circle = clicking_green_circle = false;
				console.log("Clicked on object " + opar.name);
				switch(opar.name){
					case 'lblue':
						_plane.normal.copy(new Vector3(0,1,0));
						_plane.setFromNormalAndCoplanarPoint( _plane.normal, _selected.position );
						if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
							lock2z=true;
							mouseAngleStart = _intersection.z;
							itemAngleStart = _selected.position.z;
							record_undo("move",_selected.name,[opar.position.x,opar.position.y,opar.position.z]);
						}
					break;
					case 'lred':
						_plane.normal.copy(new Vector3(0,0,1));
						_plane.setFromNormalAndCoplanarPoint( _plane.normal, _selected.position );
						if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
							lock2x=true;
							mouseAngleStart = _intersection.x;
							itemAngleStart = _selected.position.x;
							record_undo("move",_selected.name,[opar.position.x,opar.position.y,opar.position.z]);
						}
					break;
					case 'lgreen':
						_plane.normal.copy(new Vector3(0,0,1));
						_plane.setFromNormalAndCoplanarPoint( _plane.normal, _selected.position );
						if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
							lock2y=true;
							mouseAngleStart = _intersection.y;
							itemAngleStart = _selected.position.y;
							record_undo("move",_selected.name,[opar.position.x,opar.position.y,opar.position.z]);
						}
					break;
					case 'cblue':
						_plane.normal.copy(new Vector3(0,0,1));
						_plane.setFromNormalAndCoplanarPoint( _plane.normal, _selected.position );

						if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
							clicking_blue_circle = true;
							_intersection.sub( _selected.position );
							_startquat = _selected.quaternion.clone();
							mouseAngleStart = Math.atan2(_intersection.y,_intersection.x);
							itemAngleStart = _selected.rotation.z;
							record_undo("rotate",_selected.name,[opar.rotation.x,opar.rotation.y,opar.rotation.z]);
						}
					break;
					case 'cred':
						_plane.normal.copy(new Vector3(1,0,0));
						_plane.setFromNormalAndCoplanarPoint( _plane.normal, _selected.position );

						if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
							clicking_red_circle = true;
							_intersection.sub( _selected.position );
							_startquat = _selected.quaternion.clone();
							mouseAngleStart = Math.atan2(_intersection.y,_intersection.z);
							itemAngleStart = _selected.rotation.x;
							record_undo("rotate",_selected.name,[opar.rotation.x,opar.rotation.y,opar.rotation.z]);
						}
					break;
					case 'cgreen':
						_plane.normal.copy(new Vector3(0,1,0));
						_plane.setFromNormalAndCoplanarPoint( _plane.normal, _selected.position );

						if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
							clicking_green_circle = true;
							_intersection.sub( _selected.position );
							_startquat = _selected.quaternion.clone();
							mouseAngleStart = Math.atan2(_intersection.z,_intersection.x);
							itemAngleStart = _selected.rotation.y;
							record_undo("rotate",_selected.name,[opar.rotation.x,opar.rotation.y,opar.rotation.z]);
						}
					break;
				}
			} else {
				clicking_blue_circle = clicking_red_circle = clicking_green_circle = false;
				if( !found ) {
					console.log("Invalid item clicked!");
					return;
				}
				_selected = opar;

				if( selected_box == null ) selected_box = new Box3();
				scope.getGeometryBox(selected_box,opar);

				var box = new Box3().setFromObject(opar);
				var xd = box.max.x - box.min.x;
				var yd = box.max.y - box.min.y;
				var zd = box.max.z - box.min.z;
				var md = xd;
				if( yd > md ) md = yd;
				if( zd > md ) md = zd;
				if( md > 5 ) md = 5;

				if( event.shiftKey ) {
					_shiftKey = true;
					createClone(opar.myname);
				} else {
					_shiftKey = false;
				}
				if( event.altKey ) { // scale object
					_altKey = true;
					record_undo("scale",opar.name,[opar.scale.x,opar.scale.y,opar.scale.z]);
				} else {
					_altKey = false;
				}
				if( event.ctrlKey ) {
					_ctrlKey = true;
					_plane.normal.copy(new Vector3(0,0,1));
				} else {
					_ctrlKey = false;
					_plane.normal.copy(new Vector3(0,1,0));
				}
				record_undo("move",opar.name,[opar.position.x,opar.position.y,opar.position.z]);

				_plane.setFromNormalAndCoplanarPoint( _plane.normal, _selected.position );

				if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
					radStore("selectedobj", opar.myname);
					_startpos.copy( _selected.position );
					_offset.copy( _intersection );
					_domElement.style.cursor = 'move';
					moving=true;
					scope.dispatchEvent( { type: 'dragstart', object: _selected } );
					scope.drawCursorAt( _selected.position, md );
					scope.dispatchEvent( changeEvent );
				} else {
					console.log("No intersection");
					radClear("selectedobj");
					_selected=null;
					moving=false;
				}
			}
		} else {

			radClear("selectedobj");
			scope.clearCursor();

  		scope.domElement.focus ? scope.domElement.focus() : window.focus();
  		var mouseAction;

  		switch ( event.button ) {
  			case 0:
  				mouseAction = scope.mouseButtons.LEFT;
  				break;
  			case 1:
  				mouseAction = scope.mouseButtons.MIDDLE;
  				break;
  			case 2:
  				mouseAction = scope.mouseButtons.RIGHT;
  				break;
  			default:
  				mouseAction = - 1;
          break;
  		}

  		switch ( mouseAction ) {
  			case MOUSE.DOLLY:
  				if ( scope.enableZoom === false ) return;
  				handleMouseDownDolly( event );
  				state = STATE.DOLLY;
  				break;
  			case MOUSE.ROTATE:
  				if ( event.ctrlKey || event.metaKey || event.shiftKey ) {
  					if ( scope.enablePan === false ) return;
  					handleMouseDownPan( event );
  					state = STATE.PAN;
  				} else {
  					if ( scope.enableRotate === false ) return;
  					handleMouseDownRotate( event );
  					state = STATE.ROTATE;
  				}
  				break;
  			case MOUSE.PAN:
  				if ( event.ctrlKey || event.metaKey || event.shiftKey ) {
  					if ( scope.enableRotate === false ) return;
  					handleMouseDownRotate( event );
  					state = STATE.ROTATE;
  				} else {
  					if ( scope.enablePan === false ) return;
  					handleMouseDownPan( event );
  					state = STATE.PAN;
  				}
  				break;
  			default:
  				state = STATE.NONE;
          break;
  		}

  		if ( state !== STATE.NONE ) {
  			//scope.domElement.ownerDocument.addEventListener( 'pointermove', onPointerMove, false );
  			//scope.domElement.ownerDocument.addEventListener( 'pointerup', onPointerUp, false );

  			scope.dispatchEvent( startEvent );
  		}
    }
  }

	function onPointerCancel( event ) {

		event.preventDefault();

		switch ( event.pointerType ) {

			case 'mouse':
			case 'pen':
				onMouseCancel( event );
				break;

			// TODO touch

		}

	}

	var moving;

	function onMouseCancel( event ) {
		lock2x = lock2y = lock2z = false;
		if ( moving && _selected ) {
			clicking_blue_circle = clicking_red_circle = clicking_green_circle = false;
			scope.dispatchEvent( { type: 'dragend', object: _selected } );
			moving = false;
		} else if( clicking_blue_circle || clicking_red_circle || clicking_green_circle ) {
			clicking_blue_circle = clicking_red_circle = clicking_green_circle = false;
		} else {
      state = STATE.NONE;
    }
		_domElement.style.cursor = _hovered ? 'pointer' : 'auto';
	}


	function onMouseWheel( event ) {
//    if( _selected ) return;

		if ( scope.enabled === false || scope.enableZoom === false || ( state !== STATE.NONE && state !== STATE.ROTATE ) ) return;

		event.preventDefault();
		event.stopPropagation();

		scope.dispatchEvent( startEvent );

		handleMouseWheel( event );

		scope.dispatchEvent( endEvent );

	}
	function onKeyUp( event ) {
		if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

    handleKeyUp( event );
	}
  function onKeyDown( event ) {
//    if( _selected ) return;

//console.log("keydown (" + scope.enabled + ")");

    if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

    handleKeyDown( event );
  }

	function onKeyPress( event ) {
//		console.log("Keypress", event);

		if( event.ctrlKey && event.code == 'KeyZ' ) {
//			console.log("ctrl pressed");
			undo();
		}
	};


	function onTouchMove( event ) {

		event.preventDefault();
		event = event.changedTouches[ 0 ];

    if( _selected ) {
      handleTouchMoveObject( event );
    } else {
      event.stopPropagation();

  		switch ( state ) {
  			case STATE.TOUCH_ROTATE:
  				if ( scope.enableRotate === false ) return;
  				handleTouchMoveRotate( event );
  				scope.update();
  				break;
  			case STATE.TOUCH_PAN:
  				if ( scope.enablePan === false ) return;
  				handleTouchMovePan( event );
  				scope.update();
  				break;
  			case STATE.TOUCH_DOLLY_PAN:
  				if ( scope.enableZoom === false && scope.enablePan === false ) return;
  				handleTouchMoveDollyPan( event );
  				scope.update();
  				break;
  			case STATE.TOUCH_DOLLY_ROTATE:
  				if ( scope.enableZoom === false && scope.enableRotate === false ) return;
  				handleTouchMoveDollyRotate( event );
  				scope.update();
  				break;
  			default:
  				state = STATE.NONE;
  		}
    }
  }

  function handleTouchMoveObject( event ) {

		var rect = _domElement.getBoundingClientRect();

		_mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
		_mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

		_raycaster.setFromCamera( _mouse, _camera );

		if ( _selected && scope.enabled ) {

			if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {

				_selected.position.copy( _intersection.sub( _offset ).applyMatrix4( _inverseMatrix ) );

			}

			scope.dispatchEvent( { type: 'drag', object: _selected } );

			return;

		}

	}

	function onTouchStart( event ) {

		event.preventDefault();
		event = event.changedTouches[ 0 ];

		var rect = _domElement.getBoundingClientRect();

		_mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
		_mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

		_intersections.length = 0;

		_raycaster.setFromCamera( _mouse, _camera );
		 _raycaster.intersectObjects( _objects, true, _intersections );

		if ( _intersections.length > 0 ) {

			_selected = ( scope.transformGroup === true ) ? _objects[ 0 ] : _intersections[ 0 ].object;

			_plane.setFromNormalAndCoplanarPoint( _camera.getWorldDirection( _plane.normal ), _worldPosition.setFromMatrixPosition( _selected.matrixWorld ) );

			if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {

				_inverseMatrix.copy( _selected.parent.matrixWorld ).invert();
				_offset.copy( _intersection ).sub( _worldPosition.setFromMatrixPosition( _selected.matrixWorld ) );

				_domElement.style.cursor = 'move';

				scope.dispatchEvent( { type: 'dragstart', object: _selected } );
			} else {
				console.log("raycaster missed plane");
				_selected = null;
			}
		} else {
      switch ( event.touches.length ) {
  			case 1:
  				switch ( scope.touches.ONE ) {
  					case TOUCH.ROTATE:
  						if ( scope.enableRotate === false ) return;
  						handleTouchStartRotate( event );
  						state = STATE.TOUCH_ROTATE;
  						break;
  					case TOUCH.PAN:
  						if ( scope.enablePan === false ) return;
  						handleTouchStartPan( event );
  						state = STATE.TOUCH_PAN;
  						break;
  					default:
  						state = STATE.NONE;
              break;
  				}
  				break;
  			case 2:
  				switch ( scope.touches.TWO ) {
  					case TOUCH.DOLLY_PAN:
  						if ( scope.enableZoom === false && scope.enablePan === false ) return;
  						handleTouchStartDollyPan( event );
  						state = STATE.TOUCH_DOLLY_PAN;
  						break;
  					case TOUCH.DOLLY_ROTATE:
  						if ( scope.enableZoom === false && scope.enableRotate === false ) return;
  						handleTouchStartDollyRotate( event );
  						state = STATE.TOUCH_DOLLY_ROTATE;
  						break;
  					default:
  						state = STATE.NONE;
              break;
  				}
          break;
  			default:
  				state = STATE.NONE;
          break;
  		}

  		if ( state !== STATE.NONE ) {
  			scope.dispatchEvent( startEvent );
  		}
    }
  }


	function onTouchEnd( event ) {

		event.preventDefault();

		if ( _selected ) {

			scope.dispatchEvent( { type: 'dragend', object: _selected } );

			_selected = null;

		} else {
      state = STATE.NONE;
    }

		_domElement.style.cursor = 'auto';

	}

	function onContextMenu( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

	}

	activate();

	// API

	this.enabled = true;
	this.transformGroup = false;

	this.activate = activate;
	this.deactivate = deactivate;
	this.dispose = dispose;
	this.getObjects = getObjects;
  this.addObject = addObject;
	this.delObject = delObject;
};

CombinedControls.prototype = Object.create( EventDispatcher.prototype );
CombinedControls.prototype.constructor = CombinedControls;

export { CombinedControls };
