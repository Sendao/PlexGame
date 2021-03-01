function Castle(app) {
    this.app = app;
    cc = this;
    
    this.modlocaL = function() {
    	cc.app.castle = cc.app.tools.Castle;
    	cc.app.Omap = cc.Omap;
    };
    
    this.registerClasses = function() {
    	this.app.szn.registerClassBuilder( this.app.szn.typeIdByName('omap'), this.Omap );
    };
    
    this.Omap = function( keymax ) {
    	this.keymax = keymax;
    	this.tab = [];
    	var app = cc.app;
    	for( var i=0; i<this.keymax; ++i ) {
    		this.tab[i] = null;
    	}
    	
    	this.memb = function( key, type, val ) {
    		return { 'name': key, 'type': type, 'obj': val, 'key': app.namekey(key) };
    	};
    	
    	this.set = function( key, type, val ) {
    		var m = this.memb(key,type,val);
    		var j = m.key % this.keymax;
    		
    		if( this.tab[j] === null ) {
    			this.tab[j] = [ m ];
    		} else {
    			for( var i=0; i< this.tab[j].length; ++i ) {
    				if( this.tab[j][i].key == m.key && this.tab[j][i].name == m.name ) {
    					this.tab[j][i].obj = val;
    					return;
    				}
    			}
    			this.tab[j].push( m );
    		}
    	};
    	
    	this.get = function( key ) {
    		var c = app.namekey(key);
    		var j = c % this.keymax;
    		var i, result=[];
    		
    		console.log("get " + c + " => " + j);
    		
    		console.log("table length: " + this.tab[j].length);
    		if( this.tab[j] === null )
    			return null;
    		
    		for( i=0; i< this.tab[j].length; ++i ) {
    			console.log(this.tab[j][i]);
    			if( this.tab[j][i].key == c && this.tab[j][i].name == key ) {
    				console.log("found it");
    				return this.tab[j][i].obj;
    			}
    		}
    		console.log("it's not there i dont know");
    		return null;
    	};
    	
    };
};


module.exports = Castle;
