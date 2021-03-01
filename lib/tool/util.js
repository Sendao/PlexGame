"use strict";
//import * as fibers from "fibers";
//var fibers = require('fibers');
//var wait = require('wait.for');
//import * as wait from 'wait.for';
var UtilsObject = /** @class */ (function () {
    function UtilsObject(app) {
        this.randomNumber = this.randomInt;
        this.randomAlpha = this.randomStr;
        this.randomString = this.randomStr;
        this.app = app;
    }
    UtilsObject.prototype.throwStack = function (msg) {
        if (msg === void 0) { msg = 'System'; }
        var e = new Error().stack;
        console.log(msg + "\n" + e.substr(6));
    };
    UtilsObject.prototype.zeroPad = function (num, digits) {
        var str = "" + num;
        for (var i = str.length; i < digits; ++i) {
            str = "0" + str;
        }
        return str;
    };
    UtilsObject.prototype.parseJSON = function (str) {
        var o;
        try {
            o = JSON.parse(str);
        }
        catch (e) {
            /*        try {
                    var nstr = "o = " + str;
                    eval(nstr);
                  } catch( ev ) { */
            this.throwStack();
            console.log("Couldn't parse.", str, e);
            return false;
            //        }
        }
        return o;
    };
    UtilsObject.prototype.safeJSON = function (str) {
        var i, n;
        var rstr = "";
        if (typeof str == 'undefined') {
            return 'null';
        }
        for (i = 0; i < str.length; ++i) {
            if ((n = str.charCodeAt(i)) > 255) {
                rstr += "\\u" + this.zeroPad(n.toString(16), 4);
            }
            else {
                rstr += str[i];
            }
        }
        return rstr;
    };
    UtilsObject.prototype.printJSON = function (obj) {
        var i, s = "";
        if (obj === null)
            return "null";
        if (typeof obj != 'object' ||
            (typeof obj.length != 'undefined' && Object.keys(obj).length == obj.length)) {
            return this.safeJSON(JSON.stringify(obj));
        }
        var ks = Object.keys(obj);
        var x;
        if (ks.length == obj.length) {
            for (i = 0; i < obj.length; ++i) {
                if (s != "")
                    s += ",";
                s += this.printJSON(obj[i]);
            }
            return "[" + s + "]";
        }
        for (x = 0; x < ks.length; x++) {
            i = ks[x];
            if (typeof obj[i] == 'function')
                continue;
            if (s != "")
                s += ",";
            ;
            s += "\"" + this.safeJSON(i) + "\":" + this.printJSON(obj[i]);
            ;
        }
        return "{" + s + "}";
    };
    UtilsObject.prototype.cloneObject = function (obj) {
        var clone;
        var typ = this.typeOf(obj);
        var intermed;
        if (Buffer.isBuffer(obj)) {
            return Buffer.from(obj);
        }
        switch (typ) {
            case 'date':
                clone = new Date();
                clone.setTime(obj.getTime());
                break;
            case 'object':
                if (typeof obj.length != 'undefined') {
                    // this is an array-object
                    clone = [];
                }
                else {
                    clone = {};
                }
                var ks = Object.keys(obj);
                for (var i = 0; i < ks.length; ++i) {
                    clone[ks[i]] = this.cloneObject(obj[ks[i]]);
                }
                break;
            case 'array':
                clone = [];
                var ks = Object.keys(obj);
                for (var i = 0; i < obj.length; ++i) {
                    ks.splice(i, 1);
                    clone[i] = this.cloneObject(obj[i]);
                }
                for (i = 0; i < ks.length; ++i) {
                    clone[ks[i]] = this.cloneObject(obj[ks[i]]);
                }
                break;
            case 'function':
                clone = null;
                break;
            default:
                if (typeof obj == 'undefined')
                    clone = undefined;
                else {
                    intermed = this.printJSON(obj);
                    clone = this.parseJSON(intermed);
                }
                break;
        }
        return clone;
    };
    UtilsObject.prototype.typeOf = function (value) {
        var s = typeof value;
        if (s === 'object') {
            if (value) {
                if (value instanceof Date) {
                    s = 'date';
                }
                else if (value instanceof Array) {
                    s = 'array';
                }
            }
            else {
                s = 'null';
            }
        }
        return s;
    };
    UtilsObject.prototype.realValue = function (ofAString) {
        if (ofAString == "true")
            return true;
        if (ofAString == "false")
            return false;
        if (ofAString.indexOf(".") != -1) {
            if (!isNaN(parseFloat(ofAString)))
                return parseFloat(ofAString);
        }
        else {
            if (!isNaN(parseInt(ofAString)))
                return parseInt(ofAString);
        }
        return ofAString;
    };
    UtilsObject.prototype.extractFields = function (sources, params) {
        var i, parm, buildarray = false;
        var fields = {};
        var n;
        //console.log("extractFields", params);
        for (i in sources) {
            i = "" + i;
            buildarray = false;
            for (parm in params) {
                if (parm == i) {
                    //              console.log("inputValueOf(" + typeof params[i] + ":" + params[i]);
                    fields[i] = this.realValue(params[i]);
                    //              console.log("realValueOf(" + typeof fields[i] + ":" + fields[i]);
                    break;
                }
                if (parm.indexOf(i) != -1 && parm.indexOf("[") != -1) {
                    var sx = parseInt(parm.substr(i.length + 1));
                    if (!isNaN(sx)) {
                        if (!buildarray)
                            buildarray = {};
                        buildarray[sx] = this.realValue(params[parm]);
                    }
                }
            }
            if (buildarray) {
                if (this.db.app.util.typeOf(sources[i]) == 'array') {
                    var ko = Object.keys(buildarray);
                    fields[i] = [];
                    for (n = 0; n < ko.length; n++) {
                        fields[i].push(buildarray[n]);
                    }
                }
                else {
                    fields[i] = {};
                    for (n in buildarray) {
                        fields[i][n] = buildarray[n];
                    }
                }
            }
        }
        return fields;
    };
    UtilsObject.prototype.indexOf = function (array, idx) {
        var i, len = array.length;
        for (i = 0; i < len; ++i) {
            if (array[i] == idx)
                return i;
        }
        return false;
    };
    UtilsObject.prototype.locationOf = function (array, idx, startptr) {
        var i, len = array.length;
        for (i = startptr; i < len; ++i) {
            if (array[i] == idx)
                return i;
        }
        return false;
    };
    /*
      rangeOf(start, count) {
        var fin = start+count;
          //var inc = fin > 0 ? 1 : -1;
          var srch=[];
          while( start != fin ) {
              srch.push(start);
              start += inc;
          }
          return srch;
      }; */
    UtilsObject.prototype.cloneValues = function (obj, values) {
        var i;
        for (i in values) {
            obj[i] = this.cloneObject(values[i]);
        }
    };
    UtilsObject.prototype.fmtTime = function (dt) {
        var hr, min, ampm;
        hr = dt.getHours();
        min = dt.getMinutes();
        ampm = "am";
        if (min < 10)
            min = "0" + min;
        if (hr >= 12) {
            ampm = "pm";
            if (hr > 12)
                hr -= 12;
        }
        return (hr == 0 ? 12 : hr) + ":" + min + ampm;
    };
    UtilsObject.prototype.fmtDay = function (dt) {
        if (dt == 0)
            return "Mon";
        if (dt == 1)
            return "Tue";
        if (dt == 2)
            return "Wed";
        if (dt == 3)
            return "Thu";
        if (dt == 4)
            return "Fri";
        if (dt == 5)
            return "Sat";
        if (dt == 6)
            return "Sun";
    };
    UtilsObject.prototype.fmtMon = function (mn) {
        if (mn == 0)
            return "Jan";
        if (mn == 1)
            return "Feb";
        if (mn == 2)
            return "Mar";
        if (mn == 3)
            return "Apr";
        if (mn == 4)
            return "May";
        if (mn == 5)
            return "Jun";
        if (mn == 6)
            return "Jul";
        if (mn == 7)
            return "Aug";
        if (mn == 8)
            return "Sep";
        if (mn == 9)
            return "Oct";
        if (mn == 10)
            return "Nov";
        if (mn == 11)
            return "Dec";
    };
    UtilsObject.prototype.numSuffix = function (n) {
        if (n >= 4 && n <= 20)
            return "th";
        if (n % 10 == 1)
            return "st";
        if (n % 10 == 2)
            return "nd";
        if (n % 10 == 3)
            return "rd";
        return "th";
    };
    UtilsObject.prototype.dateFormat = function (idt) {
        var xdate = new Date();
        var xdt = xdate.getTime() / 1000;
        var tm = xdt - idt;
        if (tm < 30) {
            return Math.round(tm) + " seconds ago";
        }
        else if (tm < 60) {
            return "less than a minute ago";
        }
        else if (tm < 120) {
            return "about a minute ago";
        }
        else if (tm < 3600) {
            return Math.round(tm / 60) + " minutes ago";
        }
        else if (tm < 5 * 86400) {
            var pdate = new Date(idt * 1000);
            if (pdate.getDate() == xdate.getDate()) {
                return this.fmtTime(pdate);
            }
            else {
                return this.fmtDay(pdate.getDay()) + " " + this.fmtTime(pdate);
            }
        }
        else {
            var pdate = new Date(idt * 1000);
            return this.fmtMon(pdate.getMonth()) + " " + pdate.getDate() + this.numSuffix(pdate.getDate()) + ", " + this.fmtTime(pdate);
        }
        return "unknown";
    };
    UtilsObject.prototype.getDate = function () {
        var dt = new Date();
        //dt.setHours( dt.getHours() - 8 );//( dt.getTime() - ( 1000 * 3600 * 8 ) );
        return dt;
    };
    UtilsObject.prototype.getSeconds = function (fulldate) {
        var d = new Date();
        //d.setHours( d.getHours() - 8 );
        if (fulldate === false) {
            return d;
        }
        else {
            return Math.floor(d.getTime() / 1000);
        }
    };
    UtilsObject.prototype.cloneValuesFrom = function (obj, keys, values) {
        var i;
        for (i in keys) {
            if (i in values)
                obj[i] = this.cloneObject(values[i]);
        }
    };
    UtilsObject.prototype.cloneValuesOverFrom = function (obj, keys, values) {
        var i, j;
        var tp;
        for (i in keys) {
            if (i in values) {
                tp = this.typeOf(obj[i]);
                if (tp == 'object') {
                    obj[i] = {};
                    for (j in values[i]) {
                        obj[i][j] = this.cloneObject(values[i][j]);
                    }
                }
                else if (tp == 'array') {
                    obj[i] = [];
                    for (j = 0; j < values[i].length; ++j) {
                        obj[i].push(this.cloneObject(values[i][j]));
                    }
                }
                else {
                    obj[i] = this.cloneObject(values[i]);
                }
            }
        }
    };
    UtilsObject.prototype.isAlpha = function (value) {
        var upperBoundUpper = "A".charCodeAt(0);
        var lowerBoundUpper = "Z".charCodeAt(0);
        var upperBoundLower = "a".charCodeAt(0);
        var lowerBoundLower = "z".charCodeAt(0);
        for (var i = 0; i < value.length; i++) {
            var char = value.charCodeAt(i);
            if ((char >= upperBoundUpper && char <= lowerBoundUpper) ||
                (char >= upperBoundLower && char <= lowerBoundLower))
                continue;
            return false;
        }
        return true;
    };
    UtilsObject.prototype.isDigit = function (value) {
        var upperBound = "9".charCodeAt(0);
        var lowerBound = "0".charCodeAt(0);
        for (var i = 0; i < value.length; i++) {
            var char = value.charCodeAt(i);
            if (char <= upperBound && char >= lowerBound)
                continue;
            if (char == "." || (i == 0 && char == "-"))
                continue;
            return false;
        }
        return true;
    };
    UtilsObject.prototype.isSpace = function (value) {
        var i, char;
        for (i = 0; i < value.length; ++i) {
            char = value[i];
            if (char == "\n" || char == "\t" || char == " ")
                continue;
            return false;
        }
        return true;
    };
    UtilsObject.prototype.isWord = function (value) {
        var ubs = ["A", "a", "9"], lbs = ["Z", "z", "0"];
        var safeChars0 = ["-"];
        var safeChars = ["_", ".", "-", "@"];
        var i, j, ch, found, char;
        for (i = 0; i < ubs.length; ++i) {
            ubs[i] = ubs[i].charCodeAt(0);
            lbs[i] = lbs[i].charCodeAt(0);
        }
        for (i = 0; i < value.length; i++) {
            char = value[i];
            ch = char.charCodeAt(0);
            found = false;
            for (j = 0; j < ubs.length; ++j) {
                if (ch <= ubs[j] && ch >= lbs[j]) {
                    found = true;
                    break;
                }
            }
            if (found)
                continue;
            if (safeChars.indexOf(char) != -1)
                continue;
            if (i == 0 && safeChars0.indexOf(char) != -1)
                continue;
            return false;
        }
        return true;
    };
    /*
    FibreRing(cb, obj) {
      if (typeof obj != 'undefined')
        cb = cb.bind(obj);
      return function() { wait.launchFiber(cb) };
    }
    */
    /* randomInt: produce a number between a and b. */
    UtilsObject.prototype.randomInt = function (a, b) {
        return Math.floor(Math.random() * (b - a) + a);
    };
    /* randomStr: produce a len length string of letters between a and Z and 0 and 9. */
    UtilsObject.prototype.randomStr = function (len) {
        var w = '';
        var c;
        while (len > 0) {
            len--;
            c = this.randomInt(0, 61);
            if (c < 10) {
                w += c;
            }
            else if (c < 37) {
                w += String.fromCharCode(c + 87);
            }
            else {
                w += String.fromCharCode(c + 30);
            }
        }
        return w;
    };
    UtilsObject.prototype.flowNumber = function (n) {
        var sh;
        if (n > 1024001024) {
            sh = (n / 1024001024);
            return parseInt(sh) + "G"; //..
        }
        else if (n > 1024000) {
            sh = (n / 1024000);
            return parseInt(sh) + "M";
        }
        else if (n > 1024) {
            sh = (n / 1024);
            return parseInt(sh) + "K";
        }
        return n + "B";
    };
    UtilsObject.prototype.connectMailer = function () {
        /*
          this.server = email.server.connect({
            user: this.app.gmail_user,
            password: this.app.gmail_password,
            host: this.app.gmail_host,
            tls: { ciphers: "SSLv3" }
          });
          */
    };
    ;
    UtilsObject.prototype.sendMessage = function (to, ccs, subj, msg, cb) {
        if (this.server == null) {
            this.connectMailer();
        }
        this.server.send({
            text: msg,
            from: this.app.gmail_fullname + '<' + this.app.gmail_user + '>',
            to: to,
            cc: ccs,
            subject: subj
        }, function (err, message) {
            console.log(err || message);
            cb(err, message);
        });
    };
    ;
    UtilsObject.prototype.safeStyles = function (input) {
        var aStyles = ["text-decoration", "padding", "margin", "border", "font", "font-face", "font-color", "background-image", "background-color", "background"];
        var lines = input.split(";");
        var i, len = lines.length;
        var ch;
        for (i = 0; i < len; ++i) {
        }
        for (i = 0; i < len; ++i) {
            ch = input[i];
            if (ch == '{') {
            }
        }
    };
    ;
    UtilsObject.prototype.safeHTML = function (input) {
        var aTags = ["a", "b", "i", "u"];
        var aMembers = ["href", "style"];
        var i, len = input.length;
        var ch, lastch = null;
        var output = "";
        var tag_start = null, tag_string = null, tag_output = null, tag_stage = null;
        var quote_start = null, quote_output = null, quote_char = null;
        var found_equals = null, invalid_tag = false, found_invalid = false;
        var at_breaker = false;
        for (i = 0; i < len; ++i) {
            ch = input[i];
            if (tag_start != null) {
                if (quote_start != null) {
                    if (lastch == '\\') {
                        if (ch == '>') {
                            quote_output += '&gt;';
                        }
                        else {
                            quote_output += lastch + ch;
                        }
                    }
                    else if (ch == quote_char) {
                        quote_output += ch;
                        quote_start = quote_char = null;
                    }
                    else {
                        lastch = ch;
                        quote_output += ch;
                    }
                    continue;
                }
                if (this.isSpace(ch))
                    at_breaker = true;
                else if (tag_stage == 1 && ch == '=')
                    at_breaker = true;
                else if (ch == '>')
                    at_breaker = true;
                else if (ch == '\'' || ch == '"') {
                    at_breaker = true;
                    ch = "";
                }
                else if (quote_output != null) {
                    tag_output = quote_output;
                    ch = "";
                    at_breaker = true;
                }
                else {
                    at_breaker = false;
                }
                if (at_breaker) {
                    switch (tag_stage) {
                        case 0: // first word; tag name
                            tag_stage = 1;
                            if (tag_output[0] == "/" && aTags.indexOf(tag_output.slice(1)) == -1)
                                invalid_tag = true;
                            if (tag_output[0] != "/" && aTags.indexOf(tag_output) == -1)
                                invalid_tag = true;
                            tag_string = "<" + tag_output + ch;
                            break;
                        case 1: // attribute name
                            tag_stage = 2;
                            if (aMembers.indexOf(tag_output) == -1)
                                invalid_tag = true;
                            tag_string += tag_output + ch;
                            break;
                        case 2: // = sign or next attribute name
                            if (tag_output == "=") {
                                tag_stage = 3;
                            }
                            else {
                                tag_stage = 2;
                                if (aMembers.indexOf(tag_output) == -1) {
                                    invalid_tag = true;
                                }
                            }
                            tag_string += tag_output + ch;
                            break;
                        case 3: // attribute value
                            tag_stage = 1;
                            tag_string += tag_output + ch;
                            break;
                    }
                    tag_output = "";
                }
                else {
                    tag_output += ch;
                }
                tag_string += tag_output;
                if (lastch == "\\") {
                    tag_output += ch;
                    lastch = null;
                }
                else {
                    switch (ch) {
                        default:
                            tag_output += ch;
                            lastch = ch;
                            break;
                        case '>':
                            output += tag_output + ch;
                            tag_start = tag_output = null;
                            break;
                        case '"':
                        case '\'':
                            quote_output = quote_char = ch;
                            quote_start = i;
                            lastch = null;
                            break;
                    }
                }
                continue;
            }
            switch (ch) {
                case '<':
                    tag_start = i + 1;
                    invalid_tag = false;
                    tag_output = "";
                    tag_stage = 0;
                    break;
                default:
                    output += ch;
                    lastch = ch;
                    break;
            }
        }
    };
    return UtilsObject;
}());
;
module.exports = UtilsObject;
