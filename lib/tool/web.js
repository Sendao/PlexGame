"use strict";
var fs = require("fs");
var http = require("http");
var https = require("https");
var Busboy = require("busboy");
var WebObject = /** @class */ (function () {
    function WebObject(app) {
        this.myloads = {};
        this.loadtimes = {};
        this.opensockets = {};
        this.default_port = 80;
        this.default_ssl_port = 443;
        this.server = false;
        this.wsserver = false;
        this.https_server = false;
        this.wssserver = false;
        this.hostname = '';
        this.mainHandler = function (req, res) {
            var body = "", whoisit = 'remoteAddress' in req.connection ? req.connection.remoteAddress : "unknown";
            if (typeof whoisit == 'undefined') {
                console.log("Irreverent request");
                res.writeHead(504, { 'Specifier': 'None' });
                res.end();
                return;
            }
            whoisit = whoisit.split(":")[3];
            var hosts = "https:" + req.method + "//" + req.headers.host + req.url;
            this.app_static.reportrequest(hosts, whoisit);
            req.res = res; // duh
            var cc = this;
            //console.log("Request from", whoisit, "for", req.url, "at", new Date());
            this.openLoadHandler(whoisit);
            //https://stackoverflow.com/questions/3393854/get-and-set-a-single-cookie-with-node-js-http-server
            var list = {}, rc = req.headers.cookie;
            rc && rc.split(';').forEach(function (cookie) {
                var parts = cookie.split('=');
                list[parts.shift().trim()] = decodeURI(parts.join('='));
            });
            req.cookies = list;
            if (req.method == 'POST') {
                var bb;
                if (!('Content-Type' in req.headers)) {
                    if ("content-type" in req.headers) {
                        req.headers['Content-Type'] = req.headers['content-type'];
                    }
                    else {
                        req.headers['Content-Type'] = 'text/plain';
                    } /*
                    cc.app_static.report404(hosts,whoisit);
                    cc.closeLoadHandler(whoisit, true);
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<html><body>File not found.</body></html>');
                    return;*/
                }
                //console.log("Request head: ", req.headers);
                try {
                    bb = new Busboy({ headers: req.headers });
                }
                catch (err) {
                    console.log("Busboy error request headers: ", req.headers);
                    console.log("Busboy error: ", err);
                    return;
                    bb = false;
                }
                if (bb !== false) {
                    var myfiles = {};
                    var myfields = {};
                    var this_enctype = false;
                    //console.log( "Busboy request headers: ", req.headers );
                    bb.on('file', function (name, f, fn, enc, mimetype) {
                        this_enctype = enc;
                        console.log("File [" + name + "]: " + enc + ", " + mimetype + ": " + fn);
                        var mybody = [];
                        myfiles[name] = [false, 0, fn];
                        f.on('data', function (d) {
                            if (Buffer.isBuffer(d)) {
                                //console.log("Incoming data : " + typeof d + ", " + d.length);
                            }
                            else {
                                //console.log("Incoming text stream");
                            }
                            mybody.push(d);
                        });
                        f.on('end', function () {
                            var c = Buffer.concat(mybody);
                            var v = c; /*
                            if( this_enctype == '7bit' ) {
                                console.log("Transfer from 7bit to binary?");
                                v = buffer.transcode( c, 'ascii', 'binary' );
                            } else {
                                v = c;
                            }*/
                            //var v = Buffer.from( c.toString("binary"), "binary" )
                            myfiles[name] = [true, v, fn];
                            console.log("File upload finished (" + name + ", " + fn + "): " + v.length + " bytes");
                        });
                    });
                    bb.on('field', function (name, val, fnTrunc, valTrunc, encoding, mimetype) {
                        //console.log("BB Field: "+ name + "="+val);
                        myfields[name] = val;
                    });
                    bb.on('finish', function () {
                        req.files = myfiles;
                        req.params = myfields;
                        body = cc.buildArgString(myfields);
                        function jsdf() {
                            this.whoisit = whoisit;
                            this.hosts = hosts;
                            this.res = res;
                            this.req = req;
                            this.body = body;
                            this.cc = cc;
                        }
                        ;
                        var j = new jsdf();
                        try {
                            cc.app.routerControl.handle(req, body, cc.finalHandler.bind(j));
                        }
                        catch (er) {
                            if (er != "end") {
                                console.warn("We had an error", er);
                            }
                        }
                    });
                    req.pipe(bb);
                    return;
                }
            }
            req.addListener('data', function (chunk) { body += chunk; });
            req.addListener('end', function () {
                //console.log(req, body);
                if (req.url.substr(-4) == ".php") {
                    //console.info("Detected php code");
                    //console.info(req.url);
                    cc.closeLoadHandler(whoisit, true);
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<html><body>File not found.</body></html>');
                    return;
                    /*
                    phpCGI.env['DOCUMENT_ROOT'] = __dirname+'/php/spirits/';
                    phpCGI.env['REDIRECT_STATUS'] = 1;
                    phpCGI.env['REQUEST_URI'] = req.url;
                    phpCGI.env['REMOTE_ADDR'] = whoisit;
                    phpCGI.serveResponse(req, res, phpCGI.paramsForRequest(req));
        //            phpmid(req, res, function(err) {console.info("Error php", err);});
                    cc.closeLoadHandler(whoisit, false);
                    return;
                    */
                }
                if ('content-type' in req.headers && req.headers['content-type'].indexOf("multipart") != -1) {
                    // process file uploads
                    console.log("files.js report");
                    console.log("files.js report", req.headers, req.headers['content-type']);
                }
                // ... detector
                // look for numeric requests
                var isnumbers = false;
                var parts = req.url.split('/');
                var i = parts.length;
                while (i > 0) {
                    --i;
                    if (parts[i] && cc.app.util.isDigit(parts[i])) {
                        isnumbers = true;
                        break;
                    }
                }
                if (isnumbers) {
                    // bad request type (journey cannot handle it lulz)
                    //this.app_static.reportError('Numeric URL', hosts, whoisit);
                    cc.app_static.report404(hosts, whoisit);
                    cc.closeLoadHandler(whoisit, true);
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<html><body>File not found.</body></html>');
                    return;
                }
                function jsdf() {
                    this.whoisit = whoisit;
                    this.hosts = hosts;
                    this.res = res;
                    this.req = req;
                    this.body = body;
                    this.cc = cc;
                }
                ;
                var j = new jsdf();
                try {
                    cc.app.routerControl.handle(req, body, cc.finalHandler.bind(j));
                }
                catch (er) {
                    if (er != "end") {
                        console.warn("We had an error", er);
                    }
                }
            });
        };
        this.app = app;
    }
    /**
     * mainHandler_Insecure handles http:// requests.
     * @memberOf WebObject
     */
    WebObject.prototype.mainHandler_Insecure = function (req, res) {
        var body;
        var whoisit;
        body = '';
        if ('remoteAddress' in req.connection) {
            if (typeof req.connection.remoteAddress == 'undefined') {
                console.log("Irreverent request");
                res.writeHead(504, { 'Specifier': 'None' });
                res.end();
                return;
            }
            else {
                whoisit = req.connection.remoteAddress;
            }
        }
        else {
            whoisit = 'unknown';
        }
        whoisit = whoisit.split(":")[3];
        var hosts = "http." + req.method + "://" + req.headers.host + req.url;
        if (req.url.indexOf(".well-known") != -1) {
            return this.mainHandler(req, res); // thankfully, the http and https servers have exactly the same interface,
            // so the polymorphism here is fine
        }
        ;
        // if https is not available, we have to allow http by routing through https
        if (!('ssl' in this.app.config) || this.app.config.ssl == false) {
            return this.mainHandler(req, res);
        }
        else {
            //console.log("https redirect " + this.app.config.ssl );
        }
        this.app_static.reportrequest(hosts, whoisit);
        this.openLoadHandler(whoisit);
        var cc = this;
        req.addListener('data', function (chunk) { body += chunk; });
        req.addListener('end', function () {
            cc.closeLoadHandler(whoisit, false);
            res.writeHead(301, { 'Location': 'https://' + cc.app.config.hostname + req.url });
            res.end();
            return;
        });
    };
    WebObject.prototype.initialize = function () {
        this.server = http.createServer(this.mainHandler_Insecure.bind(this));
        if ('ssl' in this.app.config && fs.existsSync(this.app.config['ssl'])) {
            this.https_server = https.createServer({ pfx: fs.readFileSync(this.app.config['ssl']) }, this.mainHandler.bind(this));
        }
        if (process.env.PORT) {
            this.using_port = parseInt(process.env.PORT);
            this.using_ssl_port = parseInt(process.env.PORT) + 1;
        }
        else {
            this.using_port = this.default_port;
            this.using_ssl_port = this.default_ssl_port;
        }
        this.app_static = this.app.app_static;
        this.hostname = this.app.config['hostname'];
    };
    ;
    WebObject.prototype.startup = function () {
        this.wsserver = new this.app.tools.Websock.server(this.server);
        this.server.listen(this.using_port);
        this.wsserver.initialize();
        if (this.https_server) {
            this.wssserver = new this.app.tools.Websock.server(this.https_server);
            this.https_server.listen(this.using_ssl_port);
            this.wssserver.initialize();
            console.log("Ports " + this.using_port + ", " + this.using_ssl_port);
            console.log("Hostname " + this.hostname);
        }
        else {
            this.wssserver = false;
            console.log("Port " + this.using_port);
        }
        console.log("Servers listening.");
        this.wsclient = new this.app.tools.Websock.client("ws://" + this.hostname + ":" + this.using_port + "/", "echo-protocol");
        this.app.connect_socket_servers(this.wsserver, this.wssserver, this.app.tools.Websock);
        if (this.https_server) {
            this.wssclient = new this.app.tools.Websock.client("wss://" + this.hostname + ":" + this.using_ssl_port + "/", "echo-protocol");
        }
        else {
            this.wssclient = false;
        }
        this.app.connect_socket_clients(this.wsclient, this.wssclient);
        console.log("Initialization complete.");
    };
    ;
    WebObject.prototype.openLoadHandler = function (ipaddr) {
        if (!(ipaddr in this.opensockets)) {
            this.opensockets[ipaddr] = 1;
        }
        else {
            this.opensockets[ipaddr]++;
        }
        if (this.opensockets[ipaddr] > 50) {
            console.log("Too many open requests from " + ipaddr); // + ", blocking it.");
            //system("iptables -I INPUT -s " + ipaddr + " -j DROP");
            //this.opensockets[ipaddr] = 0;
        }
    };
    ;
    WebObject.prototype.closeLoadHandler = function (ipaddr, doLoadTest) {
        if (ipaddr in this.opensockets) {
            this.opensockets[ipaddr]--;
        }
        if (!doLoadTest)
            return;
        var tmn = new Date().getTime() / 1000;
        if (!(ipaddr in this.myloads)) {
            this.myloads[ipaddr] = 1;
        }
        else if (tmn - this.loadtimes[ipaddr] > 5) {
            this.myloads[ipaddr] = 0;
        }
        else {
            this.myloads[ipaddr]++;
        }
        this.loadtimes[ipaddr] = tmn;
        if (this.myloads[ipaddr] == 50) {
            console.log("Too many requests from " + ipaddr); // + ", blocking it.");
            //system("iptables -I INPUT -s " + ipaddr + " -j DROP");
            //this.myloads[ipaddr] = 0;
        }
    };
    ;
    WebObject.prototype.buildArgString = function (obj, nx) {
        var i, args = "", subargs;
        if (typeof nx == 'undefined')
            nx = "";
        for (i in obj) {
            if (typeof obj[i] != 'object') {
                if (args != "")
                    args += "&";
                if (nx != "")
                    args += encodeURIComponent(nx + "[" + i + "]");
                else
                    args += encodeURIComponent(i);
                args += "=" + encodeURIComponent(obj[i]);
            }
            else {
                if (nx != "")
                    subargs = this.buildArgString(obj[i], nx + "[" + i + "]");
                else
                    subargs = this.buildArgString(obj[i], i);
                if (args != "" && subargs != "")
                    args += "&" + subargs;
            }
        }
        return args;
    };
    ;
    WebObject.prototype.finalHandler = function (result) {
        if (this.req.url != '/sconfirm.js')
            console.log("finalHandler(" + result.status + "): " + this.req.url + "=" + result.encoding);
        //console.log(result);
        var common_urls = ['.*js', '.*png', '.*jpg', '.*gif', '.*ico', '.*css/.*css', '.*index.html'];
        var common_users = {};
        var ignore_urls = ['.*ico', '.*css', '.*js/.*js'];
        var whoisit = this.whoisit;
        var hosts = this.hosts;
        var req = this.req;
        var res = this.res;
        var body = this.body;
        var cc = this.cc;
        var user_errors = [406, 405];
        // 405 = method not allowed
        cc.closeLoadHandler(whoisit, true);
        if (result.status == 404) {
            cc.app_static.report404(hosts, whoisit);
        }
        else if (user_errors.indexOf(result.status) != -1) {
            // who effin cares if you fucked up?
        }
        else if (result.status != 200) {
            cc.app_static.reportError(result.status + ":" + result.body, hosts, whoisit);
        }
        else {
            var found = false;
            /* track common users more coherently
            if( whoisit in common_users ) {
                common_users[whoisit].push(hosts);
                found=true;
            }
            */
            for (var i = 0; i < ignore_urls.length; i++) {
                if (hosts.match(ignore_urls[i])) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                for (var i = 0; i < common_urls.length; i++) {
                    if (common_urls[i] == '') {
                        if (req.url == '' || req.url == '/' || req.url == 'index.html') {
                            found = true;
                            break;
                        }
                        continue;
                    }
                    if (hosts.match(common_urls[i])) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    cc.app_static.reportCommon200(hosts, whoisit);
                }
                else {
                    cc.app_static.report200(hosts, whoisit);
                }
            }
        }
        if ('Content-Type' in result.headers && result.headers['Content-Type'].indexOf('text') == -1) {
            result.encoding = 'binary';
            result.headers['Content-Length'] = Buffer.byteLength(result.body, result.encoding);
        }
        res.writeHead(result.status, result.headers);
        //console.log("Finished request");
        if (result.encoding)
            res.end(result.body, result.encoding);
        else
            res.end(result.body);
    };
    ;
    return WebObject;
}());
;
module.exports = WebObject;
