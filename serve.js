// Scott Powell 2016
var App = require('./lib/app.js');
app = new App();
app.config = require('./lib/config.js');

var Tester = require('./lib/test.js');
app.tester = new Tester(app);

var app_static = require('./lib/static.js');


var mongoose = require('mongoose');
var mdb = mongoose.connection;
mdb.on('error', (e) => {
  console.log( "Mongoose error", e );
});
mdb.on('disconnected', () => {
  console.log("Mongoose disconnected");
});
mdb.once('open', () => {
  console.log("Mongoose opened");
});

mongoose.connect('mongodb://localhost/web', {useNewUrlParser:true, keepAlive: true, keepAliveInitialDelay: 300000 });
console.log("Connecting mongoose.");

app.mongoose = mongoose;
app.mdb = mdb;

app.loadTools();

app.initialize( app_static );
app_static.self.app = app;

var FB = require('fb');
app.fb = new FB.Facebook({appId: app.config['fbid'], appSecret: app.config['fbsecret'], timeout: 30000});

var autoloads;
if( 'packages' in app.config ) {
    autoloads = app.config['packages'];
} else {
    autoloads = [ 'clients', 'projects', 'stocks', 'cms', 'chat', 'watch', 'rcs', 'ggrid', 'ed', 'marky', 'szn', 'forum', 'card', 'www' ];
}

app.configure( autoloads );

console.log("System configured.");


var journey = require('journey');
var router = new(journey.Router);
app.journey = journey;
app.routes( router );
app_static.routes( router );

app.testAndStart(  );
