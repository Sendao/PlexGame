"use strict";
/*
tool/file.js
Safe file i/o layer.

Specifically this is needed because node has failsafe defaults instead of functional defaults for file i/o.

- write to positions
 - if the position doesn't exist, append spaces/blanks
- configurable blank (spaces, zeroes, null character)
- binary i/o using utf8 encoding
- splice file contents

*/
//declare var require: any;
//declare var Buffer: any;
var fs = require("fs"); // require('fs');
//var fs = require('fs');
var FileObject = /** @class */ (function () {
    function FileObject(app) {
        this.filenames = {};
        this.blank = ' ';
    }
    FileObject.prototype.open = function (fn) {
        var h = null;
        if (!fs.existsSync(fn)) {
            h = fs.openSync(fn, "w");
        }
        else {
            h = fs.openSync(fn, "r+");
        }
        this.filenames[h] = fn;
        return h;
    };
    FileObject.prototype.close = function (handle) {
        fs.closeSync(handle);
        delete this.filenames[handle];
    };
    FileObject.prototype.size = function (handle) {
        var st = fs.statSync(this.filenames[handle]);
        return st['size'];
    };
    FileObject.prototype.append = function (handle, str, length) {
        if (length === void 0) { length = -1; }
        var position = this.size(handle);
        this.write(handle, position, str, length);
    };
    FileObject.prototype.read = function (handle) {
        var st = fs.statSync(this.filenames[handle]);
        var sz = st['size'];
        var buf = Buffer.alloc(sz);
        fs.readSync(handle, buf, 0, sz, 0);
        return buf;
    };
    FileObject.prototype.write = function (handle, position, str, length) {
        if (length === void 0) { length = -1; }
        if (length == -1)
            length = str.length;
        var sz = this.size(handle), i;
        var bs = '';
        var tbuf;
        //fs.readSync(handle,tbuf,0,4,0);
        if (sz < position) {
            //console.log("Padding from " + sz + " to " + position);
            i = sz;
            while (i < position) {
                bs += this.blank;
                ++i;
            }
            //console.log("Message = '" + bs + "' = " + bs.length);
            tbuf = Buffer.from(bs);
            fs.writeSync(handle, tbuf, 0, position - sz, sz);
            /*
            // file must be closed and reopened with newest node
            fs.closeSync( handle );
            console.log("Reopen " + this.filenames[handle]);
            h = fs.openSync( this.filenames[handle], "r+");
            */
        }
        var buf;
        if (typeof str == 'object' && Buffer.isBuffer(str)) {
            buf = str;
        }
        else {
            buf = Buffer.from(str);
        }
        //console.info(handle, buf.length, position, length);
        //console.log("Write buffer: " + str);
        fs.writeSync(handle, buf, 0, length, position);
        console.log("Write completed (" + this.filenames[handle] + ")");
    };
    FileObject.prototype.splice = function (handle, position, length, newstr, strlength) {
        if (strlength === void 0) { strlength = -1; }
        if (strlength == -1)
            strlength = newstr.length;
        //! todo: write me.
    };
    return FileObject;
}());
module.exports = FileObject;
