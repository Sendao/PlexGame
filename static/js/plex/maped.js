var mapobjects;
var undolist=[];
var windowmanager = null;
var stats = null, stats_el=null;

function setWindowManager(mgr)
{
  windowmanager = mgr;
  if( stats == null ) {
    stats = new Stats();
    window.statsObj = stats;
    stats.showPanel(0);
    document.body.appendChild(stats_el=stats.domElement);
  }
}
function disposeWindowManager()
{
  if( windowmanager != null ) {
    windowmanager.dispose();
    windowmanager = null;
    if( stats != null ) {
      stats = null;
      kamiNode(stats_el);
      stats_el=null;
    }
  }
}

function record_undo(act,id,params)
{
  if( typeof params == 'undefined' )
    undolist.push([act,id]);
  else
    undolist.push([act,id,...params]);
}
function undo()
{

  if( undolist.length <= 0 ) return;

  var hist = undolist.pop();
  var id = hist[1];
  var obj;
  var mapobjs;

  console.log("Undo: ", hist);

  switch( hist[0] ) {
    case 'move':
      obj = radVar("mapobjs." + id);
      obj.x = hist[2];
      obj.y = hist[3];
      obj.z = hist[4];
      window.moveObject(id);
      break;
    case 'rotate':
      obj = radVar("mapobjs." + id);
      obj.rotX = hist[2];
      obj.rotY = hist[3];
      obj.rotZ = hist[4];
      window.rotateObject(id);
      break;
    case 'scale':
      obj = radVar("mapobjs." + id);
      obj.sclX = hist[2];
      obj.sclY = hist[3];
      obj.sclZ = hist[4];
      window.scaleObject(id);
      break;
    case 'deleted':
      createClone(id);
      break;
    case 'created':
      obj = radVar("mapobjs." + id);
      obj.deleted = 1;
      radStore("mapobjs." + id, obj);
      window.deleteObject(id);
      break;
  }
}



function viewMaps()
{
  disposeWindowManager();
  blitzTemplate(gE("mainscroll"), "maps");
}

function sentmap(e)
{
  console.log("Sent map", e);
  var data = JSON.parse(e).data;
  var i, found=false;

  for( i=0; i<maps.length; ++i ) {
    if( maps[i]._id == data._id ) {
      maps[i] = data;
      found=true;
      break;
    }
  }
  if( !found ) {
    maps.push(data);
  }
  radStore("maps", maps);
}


function delMap(id)
{
  if( !confirm("Are you sure you want to delete this?") ) return;

  HtmlRequest("/plex/delmap", buildArgString({id: id}), finishDelMap);
}
function finishDelMap(e)
{
  console.log("finishDelMap",e);
  var o = JSON.parse(e);
  if( o.status == 'error' ) {
    alert( o.message );
  } else {
    var i, id = o.data.id;

    for( i=0; i<maps.length; ++i ) {
      if( maps[i]._id == id ) {
        maps.splice(i,1);
        radStore("maps", maps);
        break;
      }
    }
  }
}
function newMap()
{
  radStore("uploader.map", { '_id': '', 'name': '' } );
  newWindow("maped");
}
var editmapwindows = {};
function editMap(id)
{
  var i, found=false;
  if( id in editmapwindows ) {
    console.log("bring to top (" + id + ")=" + editmapwindows[id]);
    windowToTop(editmapwindows[id]);
    return;
  }
  for( i=0; i<maps.length; ++i ) {
    if( maps[i]._id == id ) {
      found=true;
      break;
    }
  }
  if( !found ) {
    alert("Error - map not found " + id);
    return;
  }
  radStore("uploader.map", maps[i]);
  radStore("mapedit." + id, { mapn: i } );

  var j = newWindow("maped", "mapedit." + id);
  var newid = windows[j].wid;
  editmapwindows[id] = newid;
}
function createObject()
{
  var id = document.forms['ctrl'].object.value;
  var mapn = radVar("selectedmap");
  var mapid = radVar("maps." + mapn + "._id");
  var mapobj = { '_id': '', 'objid': id, 'mapid': mapid, 'x': 0, 'y': 0, 'z': 0, 'rotX': 0, 'rotY': 0, 'rotZ': 0 };

  window.addToScene(mapobj);
}
function updateMapobj()
{
  var so = radVar("selectedobj");
  var mos = radVar("mapobjs");
  var mapobj = mos[so];

  window.updateMapObject(mapobj);
}
function createClone(n)
{
  var obj = radVar("mapobjs." + n);
  var newobj = {};
  for( var i in obj ) {
    if( i == 'deleted' ) continue;
    newobj[i] = obj[i];
  }
  newobj._id = '';
  window.addToScene(newobj);
}
function addMapsat(mapn)
{
  var mapid = radVar("maps." + mapn + "._id");
  var ms = { '_id': '', 'mapid': mapid, 'speed': 0.01, 'zangle': 0, 'name': '', 'color': '0xffffff', 'intensity': '0', 'size': 10, 'distance': 725 };
  var mapsats = radVar("maps." + mapn + ".sats");
  if( mapsats == null ) mapsats = [];
  mapsats.push(ms);
  radStore("maps." + mapn + ".sats",mapsats);
}
function delMapsat(mapn, n)
{
  var mapsats = radVar("maps." + mapn + ".sats");
  mapsats[n].deleted = 1;
  radStore("maps." + mapn + ".sats", mapsats);
}
function saveMapsats(mapn)
{
  var objs = radVar("maps." + mapn + ".sats");
  var mapobj = { 'objs': objs };
  var args = buildArgString(mapobj);
  HtmlRequest('/plex/sat',args,savedSatellites);
}
function savedSatellites(res)
{
  console.log("savedObjects",res);
  var odata = JSON.parse(res).data;
  var mapid = odata.mapid;
  var mapn;
  var maps = radVar("maps");
  var found=false;
  for( mapn=0; mapn<maps.length; mapn++ ) {
    if( maps[mapn]._id == mapid ) {
      found=true;
      break;
    }
  }
  if( !found ) {
    alert("Couldn't save satellites - mapid error");
    return;
  }
  var ids = odata.sats;
  var mo = radVar("maps." + mapn + ".sats");
  var n;

  console.log("Ids: ", ids);
  for( n=0; n<mo.length; ++n ) {
    if( mo[n].deleted == 1 ) {
      mo.splice(n,1);
      --n;
      continue;
    }
  }
  for( n=0; n<ids.length; ++n ) {
    if( mo[n]._id == '' ) {
      console.log("fix id " + n);
      mo[n]._id = ids[n];
    }
  }

  radStore("maps." + mapn + ".sats", mo);
}

function constructMap(id)
{
  var i, found=false;
  for( i=0; i<maps.length; ++i ) {
    if( maps[i]._id == id ) {
      found=true;
      break;
    }
  }
  if( !found ) {
    alert("Error - map not found " + id);
    return;
  }
  radStore("mapid", id);
  radStore("selectedmap", i);

  blitzTemplate(gE("mainscroll"), "mapview");
  window.drawMap(id);
}

function demoMap(id)
{
  var i, found=false;
  for( i=0; i<maps.length; ++i ) {
    if( maps[i]._id == id ) {
      found=true;
      break;
    }
  }
  if( !found ) {
    alert("Error - map not found " + id);
    return;
  }
  radStore("selectedmap", i);

  blitzTemplate(gE("mainscroll"), "gameview");
  window.drawGameMap(id);
}


function deleteObject2()
{
  var mapobjs = radVar("mapobjs");
  var i = radVar("selectedobj");

  mapobjs[i].deleted = 1;
  window.deleteObject(i);
  record_undo("deleted",i);

  radClear("selectedobj");

  radStore("mapobjs", mapobjs);
}
objsaveNest=[];
function saveObjects()
{
  var objs = radVar("mapobjs");
  var mapobj = { 'objs': [] };
  var i, obj;
  for( i=0; i<objs.length; ++i ) {
    obj = objs[i];
    if( !('_id' in obj) || obj._id == '' ) {
      obj.tempid = randStr(12);
    }
    objsaveNest.push(objs[i]);
  }
  saveObjectsOne(true);
}
function saveObjectsOne(firstTime=false)
{
  var maxobjs = 50;
  var i;
  var mapobj = { 'first': firstTime?'t':'f', 'objs': [] };
  for( i=0; i<maxobjs && i<objsaveNest.length; ++i ) {
    mapobj.objs.push( objsaveNest.shift() );
  }
  var args = buildArgString(mapobj);
  HtmlRequest('/plex/mapobjs',args,savedObjects);
}
function savedObjects(res)
{
  _savedObjects(res,true);
}
function _savedObjects(res,usenest)
{
  console.log("savedObjects",res);
  var ids = JSON.parse(res).data;
  var mo = radVar("mapobjs");
  var n, k, found;

  console.log("Ids: ", ids);
  for( n=0; n<mo.length; ++n ) {
    if( mo[n].deleted == 1 ) {
      mo.splice(n,1);
      --n;
      continue;
    }
  }
  for( n in ids ) {
    found=false;
    for( k=0; k<mo.length; ++k ) {
      if( mo[k].tempid == ids[n] ) {
        console.log("fix id " + k + ": " + n);
        mo[k]._id = n;
        found=true;
        break;
      }
    }
    if( !found ) {
      console.log("Not found idobj " + n);
    }
  }

  radStore("mapobjs", mo);
  if( usenest ) {
    if( objsaveNest.length <= 0 ) {
      alert("Map save complete");
    } else {
      saveObjectsOne();
    }
  }
}


function updmapFilters()
{
  var catid;
  if( 'ctrl' in document.forms ) {
    catid = document.forms['ctrl']['catfilter'].value;
  }
  if( typeof catid == 'undefined' || catid == '' ) catid = 'all';
  var i, nobjs=[];

  for( i=0; i<objects.length; ++i ) {
    if( objects[i].deleted === true ) continue;
    if( catid == 'all' || ( catid == 'none' && objects[i].catid == '' ) || objects[i].catid == catid ) {
      nobjs.push(objects[i]);
    }
  }
  radClear("filtered_objects");
  radStore("filtered_objects", nobjs);
}
