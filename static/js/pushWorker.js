pushWorker = function() {
  this.insaneFace = function(w) {
    this.worker = w;

    this.prefetchUrls = function(urls) {
      event.waitUntil( //https://developer.mozilla.org/en-US/docs/Web/API/InstallEvent
        caches.open(CURRENT_CACHES['prefetch']).then(function(cache) {
          cache.addAll(urls.map(function(urlToPrefetch) {
            return new Request(urlToPrefetch, {
              mode: 'no-cors'
            });
          })).then(function() {
            console.log('All resources have been fetched and cached.');
          });
        }).catch(function(error) {
          console.error('Pre-fetching failed:', error);
        })
      );
    };

    this.openClient = function(event, url) {
      var cli;
      var doRequest = async () => {
        var allClients = await clients.matchAll({
          includeUncontrolled: true
        });
        var url;

        for (cli of allClients) {
          url = new URL(client.url);

          if (url.pathname == url) {
            cli.focus();
            return cli;
          }
        }

        cli = await clients.openWindow(url);
      };
      event.waitUntil(doRequest());
      return cli;
    };

  };
  this.mask = new this.insaneFace(this);

  this.confirmMessage = function(cfid) {
    HttpRequest("https://spiritshare.org/sconfirm.js?c=" + cfid);
  };

  this.gotAttention = function() {
    HttpRequest("https://spiritshare.org/tention");
  };

  /* randomInt: produce a number between a and b. */
  this.randomInt = function(a, b) {
    return Math.floor(Math.random() * (b - a) + a);
  };
  this.randomNumber = this.randomInt;

  /* randomStr: produce a len length string of letters between a and Z and 0 and 9. */
  this.randomStr = function(len) {
    var w = '';
    while (len > 0) {
      len--;
      c = this.randomInt(0, 61);
      if (c < 10) {
        w += c;
      } else if (c < 37) {
        w += String.fromCharCode(c + 87);
      } else {
        w += String.fromCharCode(c + 30);
      }
    }
    return w;
  };
  this.randomAlpha = this.randomStr;

  this.latestNoteTag = null;

  this.postNote = function(event, note) {
    var title, message = "",
      icon, target, image = "";;
    //console.log("Got pushed note ", note);
    var k, j;
    if ((k = note.message.indexOf(".jpg")) != -1) {
      if ((j = note.message.lastIndexOf("http", k)) != -1) {
        if (!('image' in note)) {
          var url = note.message.substr(j, (k - j) + 4);
          note.image = url;
          note.message = note.message.substr(0, j) + note.message.substr(k + 4);
        }
      }
    }

    if (note.group) {
      this.latestNoteTag = note.group;
    } else if (this.latestNoteTag != null && note.hyperClear) {
      // remove the old notification(s)
      var notes = self.registration.getNotifications();
      for (var i = 0; i < notes.length; ++i) {
        notes[i].close();
      }
      this.latestNoteTag = this.randomAlpha(16);
    } else if (this.latestNoteTag != null && !(note.hyperClear)) {
      this.latestNoteTag = null;
    }


    title = note.title;
    message = note.message;
    image = note.image;
    icon = note.icon ? note.icon : "/favicon.ico";
    target = note.target ? note.target : "https://spiritshare.org/card.html";
    requireInt = note.requireInt ? note.requireInt : false;

    self.clickTarget = target;

    event.waitUntil(self.registration.showNotification(title, {
      body: message,
      tag: 'push-demo',
      icon: icon,
      badge: icon,
      requireInteraction: requireInt,
      tag: this.latestNoteTag
    }));

  };
};

var pw;

self.addEventListener('install', function(event) {
  self.skipWaiting();
  console.log("Push worker installed.");
});

self.addEventListener('activate', function(event) {
  console.log("Push worker activated.");
  pw = self.pw = new pushWorker();
});


self.addEventListener('push', function(event) {
  console.log("Got pushed event ", event);
  /*
  if (!(self.Notification && self.Notification.permission === 'granted')) {
  	console.log("Got push notification without permissions");
      return;
  }
  */

  var data = {};
  if (event.data)
    data = event.data.json();

  if( typeof self.pw == 'undefined' ) {
    self.pw = new pushWorker();
  }

  if ('notification' in data) {
    //console.log("pw = " + typeof pw);
    //console.log("self.pw = " + typeof self.pw);
    self.pw.postNote(event, data['notification']);
  }
});

self.addEventListener('notificationclick', function(event) {
  self.pw.gotAttention();
  console.log("got your a-tent-ion");

  if (clients.openWindow && self.clickTarget) {
    event.waitUntil(clients.openWindow(self.clickTarget));
  } else {
    console.log("couldn't open a window!");
  }
});
