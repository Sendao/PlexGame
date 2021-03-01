function IAmThis() {
  /* this won't work since we can't serialize the link to the function
  we could, using new Function(string), so I did leave this record here, but no. that's just not right
  this.Data = function() {
		db.control.call( this, 'work' );

		this.Workers = function() {
			this.name = 'workers';
			this.indice = {
				id: {}
			};
			this.defaults = {
				id: '',
        runAt: 0,
        schedEvent: false,
        obj: null
			};
			dbase.call( this, app, 'work' );
		};
		this.workers  = new this.Workers();

  };
  this.base = new this.Data();
  */

  this.onLoad = function(apl) {
    apl.startAppWorker(apl);
    apl.intTimer = apl.workOut(apl, apl.workCycle.bind(apl), apl.intRate);
    console.log("Worker started @ " + apl.intRate + " (" + apl.intTimer + ").");
  };

  this.modlocaL = function() {

    //// Timers ////

    this.intRate = 100;
    this.intFastTimer = -1;
    this.intTimer = -1;
    this.intR = 6;
    this.intMin = 6; // "just a second"
    this.intMax = 60; // "just a minute"

    this.fastEnable = function() {
      if( this.intFastTimer != -1 ) {
        clearInterval( this.intFastTimer );
      }
      this.intFastTimer = this.workNow(this, this.fastcycle.bind(this));
    };

    this.quietRate = function() {
      //console.log("quietRate");
      this.intR++;
      this.upClock();
    };

    this.attackRate = function() {
      //console.log("attackRate");
      this.intR--;
      this.upClock();
    };

    /* upClock: restart the system clock (heartbeat) somewhere within a sane range. */
    this.upClock = function() {
      //console.log("Set timer: " + this.intR*1000);
      if( this.intR == 'undefined' )
        this.intR = 5;
      // check nextSchedule to make sure the timer goes off nearby
			var dn = this.util.getSeconds();
			if( this.nextSched != 0 && dn + this.intR > this.nextSched ) {
        if( this.nextSched < dn ) { // timer <= 0?
          this.intR = 1;
        } else {
				  this.intR = (this.nextSched - dn);
        }
        //console.log("intRate adjusted for schedule to " + this.intR )
			} else if( this.nextSched != 0 ) {
        //console.log("intRate not adjusted (dn=" + dn + ", nextSched=" + this.nextSched + "), set at " + this.intR );
      }
      if (this.intR > this.intMax) {
        this.intR = this.intMax;
      }
      if (this.intR < this.intMin) {
        this.intR = this.intMin;
      }

      if( this.intRate != this.intR*1000 ) {
        this.intRate = this.intR*1000;
        if (this.intTimer != -1) {
          //console.log("Clear timer " + this.intTimer);
          clearInterval(this.intTimer);
        }

        this.intTimer = this.workOut(this, this.workCycle.bind(this), this.intRate);
      }
    };

    this.fastcycles = [];

    this.quickcycle = this.recycle = function(verb, fn) {
      this.fastcycles.push(verb);
      this.fastcycles.push(fn);
      if( this.intFastTimer == -1 ) this.fastEnable();
    };

    this.fastcycle = function() {
      var i;
      this.intFastTimer = -1;
      if( typeof this.fastcycles == 'undefined' ) this.fastcycles=[];
      var fc = this.fastcycles;
      this.fastcycles = [];
      for( i=0; i<fc.length; i += 2 ) {
        try {
          fc[i](fc[i+1]);
        } catch ( e ) {
          console.log("Unknown predicate", fc[i], " and ", fc[i+1]);
        }
      }
    };


    //// Messaging ////
    // Process grabs thread, sends messages, releases thread. Then messages are delivered.
    this.workers = {};
    this.messages = [];
    this.install = function(name, handler) {
      this.workers[name] = handler;
    };

    this.message = function(name, data) {
      console.log("Push message " + name);
      this.messages.push(name);
      this.messages.push(data);
      this.recycle( this.sendMessages.bind(this) );
    };

    this.sendMessages = function() {
      //console.log("MessageS: ", this.messages);
      acopy = this.util.cloneObject( this.messages );
      this.messages = [];
      len = acopy.length;
      for (i = 0; i < len; i += 2) {
        if(  acopy[i] in this.workers ) {
          this.workers[ acopy[i] ]( acopy[i+1] );
        }
      }
    };

    //// Polling ////
    // (Polling is fairly rapid as opposed to workcycling)
    this.pollers = {};
    this.register = function(name, handler, data) { // register a repeating event
      this.pollers[name] = [handler, data];
    };

    this.release = function(name) {
      if (name in this.pollers)
        delete this.pollers[name];
    };


    //// Scheduling ////
    this.schedules = {};
    this.schedTimes = [];
    this.nextSched = 0;
    this.unschedule = function(at_time) {
      for( var i=0; i<this.schedNext.length; ++i ) {
        if( this.schedNext[i] == at_time ) {
          this.schedNext.splice(i,1);
          break;
        }
      }
      delete this.schedules[at_time];
    };

    this.schedule = function(at_time, handler, data) {
      at_time = parseInt(at_time);
      if( isNaN(at_time) ) {
        this.util.throwStack("scheduler: null time");
        return;
      }
      var tn = this.util.getSeconds();
      //this.util.throwStack("Worker " + at_time + "(in " + ( at_time - tn ) + ")");
      //console.log("Worker " + at_time + "(in " + ( at_time - tn ) + ")");

      if( at_time in this.schedules ) {
        //this.util.throwStack("Double schedule " + at_time);
        this.schedules[at_time].push(handler, data);
      } else {
        var found=false;
        for( var i=0; i < this.schedTimes.length; ++i ) {
          if( at_time < this.schedTimes[i] ) {
            found=true;
            this.schedTimes.splice(i, 0, at_time);
            //console.log("Splice " + at_time + ": " + i);
            break;
          }
        }
        if( !found ) {
          this.schedTimes.push( at_time );
        }
        this.schedules[at_time] = [handler, data];

        if( this.nextSched == 0 || this.nextSched > at_time ) {
          this.nextSched = at_time;
          this.upClock();
        }
      }
    };

		this.runSchedule = function(at_time) {
      //console.log("run " + at_time);
      if( !(at_time in this.schedules) ) {
        console.log(Object.keys(this.schedules));
        this.util.throwStack("Missing schedule " + at_time);
        at_time = this.schedTimes.shift();
        var dn = this.util.getSeconds();
        if( dn > at_time ) { // not ready yet
          this.schedTimes.unshift(at_time);
          return;
        } else {
          console.log("Continuing with next schedule ("+ at_time + ")");
        }
      } else {
        this.schedTimes.shift();
      }
			var sch = this.schedules[at_time];
      delete this.schedules[at_time];

      for( var i=0; i<sch.length; i+=2 ) {
        try {
			    sch[i]( sch[i+1] );
        } catch( e ) {
          console.log(e);
        }
      }

			if( this.schedTimes.length > 0 ) {
				this.nextSched = this.schedTimes[0];
        var dn = this.util.getSeconds();
        //console.log("Next: " + this.nextSched + " in " + ( this.nextSched - dn ));
        this.upClock();
			} else {
        console.log("Timers ended.");
				this.nextSched = 0;
      }
		};

    /* workcycle: convey the system clock to the functional boundaries. */
    this.workcycle = function() {
      var i, len, f, acopy;
      var found = false;
			var dn = this.util.getSeconds();
      const DATA_RATE = 20;

//console.log("worker::workcycle ns=" + this.nextSched + ", dn=" + dn);
			if( this.nextSched != 0 && dn >= this.nextSched ) {
				this.runSchedule( this.nextSched );
			}

      if (this.fullworkn == 5) {
        this.fullworkcycle = [];
        this.buildcycle = true;
      }
      this.fullworkn = ((this.fullworkn + 1) % DATA_RATE);
      //console.log("mainwork", this.buildcycle, this.fullworkcycle.length);

      //! this should be moved elsewhere
      if ('tracks' in this && typeof this.tracks != 'undefined') {
        var k, code, logs, logs_new;

        var dnow = this.util.getDate();

        for (code in this.tracks) {
          logs = this.tracks[code];
          logs_new = [];
          for (k = 0; k < logs.length; ++k) {
            // check date
            if (dnow - logs[k][0] > this.cleaners[code]) {
              // 	truncate
            } else {
              logs_new.push(logs[k]);
            }
          }

          this.tracks[code] = logs_new;
        }
      }

      //console.log("run pollers");
      acopy = this.pollers;
			for( i in this.pollers ) {
				this.pollers[i][0]( this.pollers[i][1] );
			}

      if( this.messages.length > 0 ) {
        //console.log("send messages");
        this.sendMessages();
      }

      if (this.buildcycle) {
        //console.log("rebuild");
        this.buildcycle = false;
        for (i in this.sing) {
          if ('workcycle' in this.sing[i]) {
            //console.log("build - sing ", i);
            this.fullworkcycle.push(this.sing[i]);
          }
          if ('base' in this.sing[i] && this.sing[i].base !== false && 'workcycle' in this.sing[i].base) {
            //console.log("build - sing base ", i);
            this.fullworkcycle.push(this.sing[i].base);
          }
        }
        var workplaces = [ 'data', 'ctrl', 'base', 'tools' ];
        for( var w=0; w<workplaces.length; ++w ) {
          for( i in this[ workplaces[w] ] ) {
            if( 'workcycle' in this[ workplaces[w] ][i] ) {
              //console.log("Register workplace " + workplaces[w] + "." + i);
              this.fullworkcycle.push( this[ workplaces[w] ][i] );
            }
          }
        }
      }

      //console.log("fullworkcycle()");
      len = this.fullworkcycle.length;
      for (i = 0; i < len; ++i) {
        found = this.fullworkcycle[i].workcycle();
        if (found) break;
      }
      //console.log("found at ", i, len);
      for (++i; i < len; ++i) {
        this.fullworkcycle[i].workcycle();
      }

      if (!found) {
        this.quietRate();
      } else {
        this.attackRate(); // process events more or less quickly
      }
    };

  };
};

module.exports = IAmThis;
