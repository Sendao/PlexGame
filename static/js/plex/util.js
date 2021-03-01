var Util = function(game)
{
  this.getWorldCoord = function(mesh, pos)
  {
    var p = pos.clone();
    p.applyQuaternion(mesh.quaternion);
    p.add(mesh.position);
    return p;
  };

  this.castShadowsFrom = function(light, isfaraway)
  {
    light.castShadow = true;
    var d = 20;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
        //Set up shadow properties for the light
    light.shadow.mapSize.width = 512; // default
    light.shadow.mapSize.height = 512; // default
    light.shadow.camera.near = 1.0; // default
    if( isfaraway == true )
      light.shadow.camera.far = 600; // default
    else
      light.shadow.camera.far = 100;
  };

  this.scanArea = function(vmin, vmax)
  {


  };


};

export { Util };
