var email = require('emailjs');

function DynApp(app) {
    this.app = app;
    this.params = {};
    this.server = null;
    
    this.connectMailer = function( ) {
        this.server = email.server.connect( {
            user: this.app.config['gmail_user'],
            password: this.app.config['gmail_pass'],
            host: this.app.config['gmail_host'],
            tls: {ciphers: "SSLv3"}
        } );
    };
    this.sendMessage = function( to, ccs, subj, msg, cb ) {
        if( this.server == null ) {
            connectMailer();
        }
        this.server.send( {
            text: msg,
            from: this.app.config['gmail_fullname'] + '<' + this.app.config['gmail_user'] + '>',
            to: to,
            cc: ccs,
            subject: subj }, function( err, message ) {
                console.log(err||message);
                cb(err,message);
            });
    };
};

module.exports = DynApp;
