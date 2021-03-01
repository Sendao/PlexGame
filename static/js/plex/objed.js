function viewUploader()
{
  disposeWindowManager();
  blitzTemplate(gE("mainscroll"), "upload");
}

function gotBreakable(data)
{
  alert("Breakable finished uploading.");
}

function sentobject(e)
{
  console.log("Sent object", e);
  var data = JSON.parse(e).data;
  alert("Upload complete");
  var i, id = data._id, found=false;
  data.ondisplay = true;
  for( i=0; i<objects.length; ++i ) {
    if( objects[i]._id == id ) {
      objects.splice(i,1,data);
      found=true;
      break;
    }
  }
  if( !found ) {
    objects.push(data);
  }
  radStore("objects", objects);
  upduplFilters();
  updmapFilters();
}

function downloadObject(id)
{
  window.open("https://plex.spiritshare.org/plex/obj/" + id + ".zip");
}

function delObject(id)
{
  if( !confirm("Are you sure you want to delete that?") ) return;

  HtmlRequest("/plex/delobj", buildArgString({id: id}), finishDelObject);
}
function finishDelObject(e)
{
  console.log("finishDelObject",e);
  var o = JSON.parse(e);
  if( o.status == 'error' ) {
    alert( o.message );
  } else {
    var i, id = o.data.id;

    for( i=0; i<objects.length; ++i ) {
      if( objects[i]._id == id ) {
        objects[i].deleted = true;
        radStore("objects", objects);
        updmapFilters();
        upduplFilters();
        break;
      }
    }
  }
}
function newObject()
{
  radStore("uploader.object", { '_id': '', 'name': '' } );
  newWindow("objected");
}
function editObject(id)
{
  var i, found=false;
  for( i=0; i<objects.length; ++i ) {
    if( objects[i]._id == id ) {
      found=true;
      break;
    }
  }
  if( !found ) {
    alert("Error - object not found " + id);
    return;
  }
  radStore("uploader.object", objects[i]);
  newWindow("objected");
}

function viewObject(id)
{
  var i, found=false;
  for( i=0; i<objects.length; ++i ) {
    if( objects[i]._id == id ) {
      found=true;
      break;
    }
  }
  if( !found ) {
    alert("Error - object not found " + id);
    return;
  }
  newWindow("objectview", "objects." + i, false, 700, 600);
}

function drawObject(e)
{
  window.drawObject(e);
}

function viewCategories()
{
  disposeWindowManager();
  blitzTemplate(gE("mainscroll"), "cats");
}

function newCategory()
{
  radStore("uploader.cat", { '_id': '', 'name': '' } );
  newWindow("cated");
}
function editCategory(id)
{
  var i, found=false;
  for( i=0; i<cats.length; ++i ) {
    if( cats[i]._id == id ) {
      found=true;
      break;
    }
  }
  if( !found ) {
    alert("Error - object not found " + id);
    return;
  }
  radStore("uploader.cat", cats[i]);
  newWindow("cated");
}

function delCategory(id)
{
  if( !confirm("Are you sure you want to delete that?") ) return;

  HtmlRequest("/plex/delcat", buildArgString({id: id}), finishDelCategory);
}
function finishDelCategory(e)
{
  console.log("finishDelCategory",e);
  var o = JSON.parse(e);
  if( o.status == 'error' ) {
    alert( o.message );
  } else {
    var i, id = o.data.id;

    for( i=0; i<cats.length; ++i ) {
      if( cats[i]._id == id ) {
        cats.splice(i,1);
        radStore("cats", cats);
        break;
      }
    }
  }
}
function sentcategory(e)
{
  console.log("Sent category", e);
  var data = JSON.parse(e).data;
  var i, id = data._id, found=false;
  for( i=0; i<cats.length; ++i ) {
    if( cats[i]._id == id ) {
      cats.splice(i,1,data);
      found=true;
      break;
    }
  }
  if( !found )
    cats.push(data);
  radStore("cats", cats);
}


function upduplFilters()
{
  var catid = document.forms['uplfilters']['cat'].value;
  var i;

  for( i=0; i<objects.length; ++i ) {
    if( objects[i].deleted === true ) {
      objects[i].ondisplay = false;
      continue;
    }
    if( catid == 'all' || ( catid == 'none' && objects[i].catid == '' ) || objects[i].catid == catid ) {
      objects[i].ondisplay = true;
    } else {
      objects[i].ondisplay = false;
    }
  }
  radStore("objects", objects);
}

var objstodelete = [];
function delallCategory()
{
  var catid = document.forms['uplfilters']['cat'].value;
  if( catid == 'none' ) return;
  var i;

  for( i=0; i<cats.length; ++i ) {
    if( cats[i]._id == catid ) {
      if( cats[i].name.substr(0,4).toLowerCase() != "test" && cats[i].name != 'Uploads' ) {
        alert("You can't do that. You can only empty the Tests suite.");
        return;
      }
    }
  }

  if( !confirm("Are you REALLY sure you want to delete ALL these items?") ) return;

  var i;

  for( i=0; i<objects.length; ++i ) {
    if( objects[i].ondisplay == true ) {
      objstodelete.push( objects[i]._id );
    }
  }
  var o = objstodelete.pop();
  HtmlRequest("/plex/delobj", buildArgString({id: o}), finishDelObject2);
}

function finishDelObject2(data)
{
  finishDelObject(data);
  if( objstodelete.length > 0 ) {
    var o = objstodelete.pop();
    HtmlRequest("/plex/delobj", buildArgString({id: o}), finishDelObject2);
  } else {
    alert("Ok, items deleted.");
  }
}
