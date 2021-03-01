var Types = require('mongoose').Schema.Types;
var ObjectID = Types.ObjectId;
var Buffer = Types.Buffer;

module.exports = function WWWDatabase(myapp) {
  var cc = this;
  var app = myapp;
  var mongoose = app.mongoose;

  this.objects = new mongoose.Schema({
    id: { type: ObjectID, index: true },
    name: { type: String, default: '', index: true },
    tags: { type: String, default: '' },
    catid: { type: String, default: '' },
    scriptid: { type: String, default: '' },
    resized: { type: Boolean, default: false, index: true },
    data: { type: Buffer, default: '' }
  }, { timestamps: true } );
  this.Objects = app.tools.Mongoose.schemaModel('plexObjects', this.objects, true);

  this.objcats = new mongoose.Schema({
    id: { type: ObjectID, index: true },
    name: { type: String, default: '' },
  });
  this.Objcats = app.tools.Mongoose.schemaModel('plexObjcats', this.objcats, true);

  this.objdata = new mongoose.Schema({
    id: { type: ObjectID, index: true },
    objid: { type: ObjectID, index: true },
    type: Number,
    data: String
  });
  this.Objdata = app.tools.Mongoose.schemaModel('plexObjdata', this.objdata, true);

  this.players = new mongoose.Schema({
    id: ObjectID,
    userid: ObjectID,
    security: { type: Number, default: 0 }
  });
  this.Players = app.tools.Mongoose.schemaModel('plexPlayers', this.players, true);

  this.maps = new mongoose.Schema({
    id: ObjectID,
    name: { type: String, default: '', index: true },
    envmap: { type: String, default: '' },
    skydome: { type: String, default: '' }
  });
  this.Maps = app.tools.Mongoose.schemaModel('plexMaps', this.maps, true);

  this.mapobjects = new mongoose.Schema({
    id: ObjectID,
    mapid: { type: ObjectID, index: true },
    objid: ObjectID,
    scriptid: { type: String, default: '' },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    z: { type: Number, default: 0 },
    rotX: { type: Number, default: 0 },
    rotY: { type: Number, default: 0 },
    rotZ: { type: Number, default: 0 },
    sclX: { type: Number, default: 1 },
    sclY: { type: Number, default: 1 },
    sclZ: { type: Number, default: 1 }
  });
  this.Mapobjects = app.tools.Mongoose.schemaModel('plexMapobjects', this.mapobjects, true);

  this.mapsats = new mongoose.Schema({
    id: ObjectID,
    mapid: { type: ObjectID, index: true },
    name: { type: String, default: '' },
    zangle: { type: Number, default: 0 },
    speed: { type: Number, default: 0.01 },
    texture: String,
    color: String,
    size: { type: Number, default: 10 },
    distance: { type: Number, default: 725 },
    intensity: { type: Number, default: 0 }
  });
  this.Mapsats = app.tools.Mongoose.schemaModel('plexMapsats', this.mapsats, true);

  this.scripts = new mongoose.Schema({
    id: ObjectID,
    name: { type: String, default: '', index: true },
    events: { type: String, default: '' }
  });
  this.Scripts = app.tools.Mongoose.schemaModel('plexScripts', this.scripts, true);
};
