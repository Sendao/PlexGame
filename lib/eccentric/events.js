function Event() {
    this.pollers = [];
    this.receivers = [];
    this.messengers = {};
    this.workcycle = function() {
        var recvcopy = this.receivers;
        this.receivers = [];
        var i, len = recvcopy.length;
        
        for( i=0; i<len; i += 3 ) {
            recvcopy[i](recvcopy[i+1], recvcopy[i+2]);
        }
        
        len = this.pollers.length;
        for( i=0; i<len; i += 2 ) {
            this.receivers.push(this.pollers[i]);
            this.receivers.push(this.pollers[i+1]);
            this.receivers.push(null);
        }
    };
    this.request = function(handle, data) { // for single workloads
        this.receivers.push(handle);
        this.receivers.push(data);
        this.receivers.push(null);
    };
    this.register = function(name, handle, data) { // for exponential workloads
        if( name == 'idle' ) {
            this.pollers.push(handle);
            this.pollers.push(data);
        } else {
            this.messengers[name] = [handle,data];
        }
    };
    this.message = function(name, handle, data) { // trigger exponential message
        if( !(name in this.messengers) ) return false;
        var v = this.messengers[name];
        this.receivers.push(v[0]);
        this.receivers.push(v[1]);
        this.receivers.push(data);
    };
    
};

module.exports = Event;
