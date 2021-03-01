module.exports = function SessionSinglet(myapp) {
    var cc = this;
    var app = myapp;
    var db = app.db;
    var dbase = app.dbase;
    this.app = app;
    /*
    this.Data = function() {
        db.control.call(this, 'auth');
    
        this.Users = function() {
            this.name = 'users';
            this.indice = { 'id': {}, "name": {}, "email": {} };
            this.defaults = { 'name': '', 'email': '', 'password': '', 'dtlast': 0, 'permissions': [ 'guest', 'user' ] };
            dbase.call(this, app, 'auth');
        };
        this.users = new this.Users();
        
        this.Sessions = function() {
            this.name = 'sessions';
            this.indice = {  'id': {}, "key": {} };
            this.defaults = { 'key': '', 'fed': '', 'userid': '-1', 'dtstamp': 0, 'permissions': [ 'guest' ] };
            dbase.call(this, app, 'auth' );
        };
        this.sessions = new this.Sessions();
    };
    */
    this.routes = function(router) {
        router.get('/tests.json').bind( this.testsRun.bind(this) );
    };
    this.randomData = 0;
    
    this.testsRun = function(req, res, params) {
        this.randomData += 1;
        var myTestData = [ 1, 2, 3, this.randomData ];
        this.randomData += 1;
        myTestData.push(this.randomData);
        res.send(200, {}, myTestData);
    };
    
};
