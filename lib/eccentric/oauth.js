function OAuth(app) {
    this.app = app;
	this.params = {};
    
    // create a new session
    this.session = function( _url, _params ) {
    	var cc = this;
		this.cc = cc;
		console.log("Test app: " + typeof cc.app.flowNumber);
		this.url = _url;
		this.params = _params;
		
		this.getAuthUrl = function() {
			return this.url;
		};

		this.setAuth = function( auth ) {
			this.auth = _auth;
		};

		this.req = function( url ) { // must be called inside a fibrering
//			cc.tool.util.FibreRing( function() {
//				x = oauth.req(url);
//			} );
			
			if( url.substr(0,7) != "http://" ) {
				return 'invalid url';
			}
			var suburl = url.substr(7);
			var urlparts = suburl.split("/");
			var urlhost = urlparts[0];
			var urlpath = urlparts.slice(1).join("/")
				
			return cc.tool.wait.forMethod( cc.tool.http.get, urlhost, urlpath );
		};

		this.upd = function( url, newmodel ) {
		};
    };
}

module.exports = OAuth;
