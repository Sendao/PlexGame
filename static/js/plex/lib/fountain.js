this.psys = game.particles.getSystem('one',
{
  texture: { value: THREE.ImageUtils.loadTexture('/drop.png') },
  maxParticleCount: 2000
});
this.psys.addEmitter({
  maxAge: {
    value: 2
  },
  position: {
    value: obj.position.clone(),
    spread: new THREE.Vector3( 0, 0, 0 )
  },
  acceleration: {
    value: new THREE.Vector3(0, -10, 0),
    spread: new THREE.Vector3( 10, 0, 10 )
  },
  velocity: {
    value: new THREE.Vector3(0, 25, 0),
    spread: new THREE.Vector3(10, 7.5, 10)
  },
  color: {
    value: [ new THREE.Color('white'), new THREE.Color('red') ]
  },
  size: {
    value: 1
  },
  particleCount: 2000
});
