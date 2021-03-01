module.exports = function SessionSinglet(myapp) {
    var cc = this;
    var app = myapp;
    var db = app.db;
    var dbase = app.dbase;
    this.app = app;

    this.allow_access = false;

    this.routes = function(router) {
        router.post('/console').bind( this.consoleRun.bind(this) );
    };

    this.consoleRun = function(req, res, params) {
        var sess;
        if( !this.allow_access ) {
            sess = this.app.requireAdmin(req, res, params);
        } else {
            sess = this.app.requireUser(req, res, params);
        }
	if( !sess ) return;

        console.log("Express:\n", params['r']);
        var run = eval(params['r']);
        console.log("Console:\n", run);
        res.send(200, {}, run);
    };

};
