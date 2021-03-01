var fs = require('fs');
module.exports = function TestingObject(app, fw)
{
    this.run = function() {
    	var f = app.file, h;
    	
        //! tests for:

    	if( fs.existsSync("./test_file") ) {
    		fs.unlinkSync("./test_file");
    	}
    	if( fs.existsSync("./test_file2") ) {
    		fs.unlinkSync("./test_file2");
    	}
    	
        // 1. write to a new blank file
    	h = f.open("./test_file");
    	f.write(h, 0, "test123");
    	f.close(h);
    	
        // .. verify by reading
    	s = fs.readFileSync("./test_file", "utf8");
    	fw.assert(s=="test123", "write() at position 0: " + s);
    	
        // 3. write at random offset of empty file
    	h = f.open("./test_file2");
    	f.write(h, 10, "test1234");
    	f.close(h);
    	
        // .. verify by reading
    	s = fs.readFileSync("./test_file2", "utf8");
    	fw.assert(s.substr(10)=="test1234", "write() at position 10: " + s);

    	// 4. write at random offset of non-empty file
    	h = f.open("./test_file");
    	f.write(h, 10, "test1234");
    	f.close(h);
    	
        // .. verify by reading
    	s = fs.readFileSync("./test_file", "utf8");
    	fw.assert(s.substr(10)=="test1234", "write() at position 10");
    	
    	//fs.unlinkSync("./test_file");
    	//fs.unlinkSync("./test_file2");
    };
};
