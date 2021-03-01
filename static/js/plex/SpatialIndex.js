import {
	Box3,
  Vector3
} from 'https://unpkg.com/three@0.123.0/build/three.module.js';

var SpatialIndex = function ( ) {
  var maxwidth = 500;
  var maxheight = 500;
  var rounder = 5;

  this.idx = null;

  this.init = function() {
    var i,j;

    this.idx = [];
    for( i=0; i*rounder<maxwidth; i++ ) {
      this.idx[i] = [];
      for( j=0; j*rounder<maxheight; j++ ) {
        this.idx[i][j] = [];
      }
    }
  };
  this.translate = function(box,dist)
  {
    box.min.x += dist;
    box.min.z += dist;
    box.max.x += dist;
    box.max.z += dist;
  };

  this.search = function(box) {
    this.translate(box,maxwidth/2);
    var results = [];
    var i,j;
    var iMax = ceilBy(box.max.x,rounder)/rounder;
    var jMin = floorBy(box.min.z,rounder)/rounder;
    var jMax = ceilBy(box.max.z,rounder)/rounder;

    for( i=floorBy(box.min.x,rounder)/rounder; i<jMax; ++i ) {
      for( j=jMin; j<jMax; ++j ) {
        results.push( ...this.idx[i][j] );
      }
    }
    return results;
  };

  this.add = function(box, obj) {
    this.translate(box,maxwidth/2);
    var i,j;
    var iMax = ceilBy(box.max.x,rounder)/rounder;
    var jMin = floorBy(box.min.z,rounder)/rounder;
    var jMax = ceilBy(box.max.z,rounder)/rounder;

    for( i=floorBy(box.min.x,rounder)/rounder; i<jMax; ++i ) {
      for( j=jMin; j<jMax; ++j ) {
        this.idx[i][j].push(obj);
      }
    }
  };

  this.remove = function(box, obj) {
    this.translate(box,maxwidth/2);
    var i,j;
    var iMax = ceilBy(box.max.x,rounder)/rounder;
    var jMin = floorBy(box.min.z,rounder)/rounder;
    var jMax = ceilBy(box.max.z,rounder)/rounder;
    var k;

    for( i=floorBy(box.min.x,rounder)/rounder; i<jMax; ++i ) {
      for( j=jMin; j<jMax; ++j ) {
        for( k=0; k<this.idx[i][j].length; ++k ) {
          if( this.idx[i][j][k] === obj ) {
            this.idx[i][j].splice(k,1);
            break;
          }
        }
      }
    }
  };
};

export { SpatialIndex };
