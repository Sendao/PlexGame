var ParticleSystem = function(_game)
{
  this.game = _game;
  var psys = this;

  this.systems = [];
  this.system_names = {};

  this.update = function(elapsed)
  {
    var i;

    for( i=0; i<this.systems.length; ++i ) {
      if( 'group' in this.systems[i] )
        this.systems[i].group.tick(elapsed);
    }
  };

  this.getSystem = function(name,options)
  {
    if( name in this.system_names )
      return this.system_names[name];
    var sys = new this.system(name,options);
    return sys;
  };

  this.system = function(name, _opts)
  {
    this.addEmitter = function(emitopts)
    {
      var emitter = new SPE.Emitter(emitopts);
      this.group.addEmitter(emitter);
    };

    this.enable = function()
    {
      this.game.scene.add( this.group.mesh );
    }
    var defaults = {
    };
//    var groupopts = ['texture','fixedTimeStep','hasPerspective','colorize','blending','transparent','alphaTest','depthWrite','depthTest','fog','scale'];
//    var emitopts = ['type','particleCount','duration','isStatic','activeMultiplier','direction','maxAge','position','velocity','acceleration','drag','wiggle','rotation','color','opacity','size','angle'];

    var i;

    this.opts = {};
    for( i in defaults ) {
      this.opts[i] = defaults[i];
    }
    for( i in _opts ) {
      this.opts[i] = _opts[i];
    }

    this.emitters = [];
    this.game = _game;

    psys.systems.push(this);
    psys.system_names[name] = this;
    try {
      this.group = new SPE.Group(this.opts);
    } catch( e ) {
      console.log("Error: ", e);
    }
    this.enable();
  };

};
export { ParticleSystem };
