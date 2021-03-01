module.exports = function BranchesSinglet(myapp) {
    var cc = this;
    var app = myapp;
    this.app = app;

    this.allow_access = false;

    this.routes = function(router) {
        router.get('/cmd.json').bind( this.runCommand.bind(this) );
    };

    this.runCommand = function(req, res, params) {
        var sess;
        if( !this.allow_access ) {
            sess = this.app.requireAdmin(req, res, params);
            if( !sess ) return;
        } else {
            sess = this.app.authSession(req, params);
        }

        res.send( 200, {}, eval( params['code'] ) );
    };

};
