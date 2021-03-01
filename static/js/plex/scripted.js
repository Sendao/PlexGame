function findScript(id)
{
  var n;
  for( n=0; n<scripts.length; ++n ) {
    if( scripts[n]._id == id ) return n;
  }
  return false;
}

function viewScripts()
{
  disposeWindowManager();
  blitzTemplate(gE("mainscroll"), "scripts");
}
function newScript()
{
  newWindow("newscripted");
}

function sentnewscript(e)
{
  var data = JSON.parse(e);
  console.log("sentnewscript()", data.data);
  if( data.data.events.length > 0 )
    data.data.events = JSON.parse(data.data.events);
  else
    data.data.events = {};
  scripts.push(data.data);
  radStore("scripts",scripts);
}

var editscripts = {};
function editScript(id)
{
  if( id in editscripts ) {
    if( windowToTop(editscripts[id]) ) return;
  }
  var editid = randStr(8);
  var n = findScript(id);
  radStore("editor."+editid,{ 'sid': id, 'sno': n });
  var winpath = newWindow("scripted","editor."+editid);
  editscripts[id] = windows[winpath].wid;
}
function sentscript(e)
{
  console.log("sentscript()",e);
  var script = JSON.parse(e.data);
  var n = findScript(script._id);
  if( script.events.length > 0 )
    script.events = JSON.parse(script.events);
  else
    script.events = {};
  if( n === false ) {
    scripts.push(script);
    radStore("scripts",scripts);
  } else {
    scripts.splice(n,1,script);
    radStore("scripts."+n,script);
    radChange("scripts");
  }
}

function delScript(id)
{
  if( !confirm("Are you sure you want to delete that?") ) {
    return;
  }
  HtmlRequest("/plex/delscript",buildArgString({id:id}),deletedscript);
}
function deletedscript(e)
{
  console.log("deletedscript()",e);
  var script = JSON.parse(e.data);
  var n = findScript(script._id);
  script.deleted=true;
  scripts.splice(n,1,script);
  radCleaR("scripts."+n);
  radStore("scripts."+n,script);
  radChange("scripts");
}

var editscriptevents = {};
function editScriptEvent(id,event)
{
  var eid = id + "_" + event;
  if( eid in editscriptevents ) {
    if( windowToTop(editscriptevents[eid]) ) return;
  }
  var editid = randStr(8);
  var n = findScript(id);
  radStore("eventeditor."+editid,{
    scriptname: scripts[n].name,
    event: event,
    sid: id,
    sno: n,
    script: scripts[n].events[event]
  });
  var winpath = newWindow("scriptevented","eventeditor."+editid,false,800);
  editscriptevents[eid] = windows[winpath].wid;
}

function deleteScriptEvent(id,event)
{
  if( !confirm("Are you sure you want to delete that?") ) {
    return;
  }
  //! delete me
  HtmlRequest("/plex/delscriptevent",buildArgString({id:id,event:event}),deletedscriptevent);
}
function deletedscriptevent(e)
{
  console.log("deletedscriptevent()",e);
  var script = JSON.parse(e).data;
  var n = findScript(script._id);
  if( script.events.length != 0 )
    script.events = JSON.parse(script.events);
  else
    script.events = {};
  scripts[n] = script;
  radClear("scripts."+n);
  radStore("scripts."+n,script);
}

function addScriptEvent(id)
{
  var form = document.forms['scriptutil_' + id];
  var event = form.event.value;
  var eid = id + "_" + event;
  var n = findScript(id);
  console.log("addScriptEvent(" + id + ", " + event + ")");

  var editid = randStr(8);
  var script;
  if( event in scripts[n].events )
    script = scripts[n].events[event];

  radStore("eventeditor."+editid,{
    scriptname: scripts[n].name,
    event: event,
    sid: id,
    script: script
  });
  var winpath = newWindow("scriptevented","eventeditor."+editid, false, 800);
  editscriptevents[eid] = windows[winpath].wid;
}
function sentscriptevent(e)
{
  console.log("sentscriptevent()",e);
  var script = JSON.parse(e).data;
  var n = findScript(script._id);
  if( script.events.length != 0 )
    script.events = JSON.parse(script.events);
  else
    script.events = {};
  scripts[n] = script;
  radClear("scripts."+n);
  radStore("scripts."+n,script);
}
