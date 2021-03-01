var ObjectID = require('mongoose').Schema.Types.ObjectId;

module.exports = function PlexData() {
  this.users = [];
  this.players = {};
  this.userids = {};

  this.registerPlayer = function(userid,pagekey,cb)
  {
    var user = { key: pagekey, playerid: '', client: this.app.locateUser(pagekey) };
    this.users.push(user);
    this.objs.Players.find({userid: userid}, function(e,docs) {
      var i, player;

      if( docs.length == 0 ) {
        // new player
        player = new this.objs.Players();
        player.userid = userid;
        player.save( function(e) {
          if( e ) console.log("Error saving new player ", e);
          user.playerid = player._id;
          this.players[player._id] = player.toObject();
          this.userids[userid] = player._id;
          cb();
        }.bind(this));
      } else {
        player = docs[0].toObject();
        user.playerid = player._id;
        this.players[player._id] = player;
        this.userids[userid] = player._id;
        cb();
      }
    }.bind(this));
  };

  this.sendUpdate = function(table, id, changes)
  {
    var i;
    var message = { t: table, id: id, doc: changes };

    for( i=0; i<this.users.length; ++i ) {
      if( this.users[i].client.closed ) {
        this.users.splice(i,1);
        --i;
        continue;
      }
      this.users[i].client.send(message,null,false);
    }
  };

  this.sendUpdates = function(table, changelist)
  {
    var i;
    var message = { t: table, docs: changelist };

    for( i=0; i<this.users.length; ++i ) {
      if( this.users[i].client.closed ) {
        this.users.splice(i,1);
        --i;
        continue;
      }
      this.users[i].client.send(message,null,false);
    }
  };
};
