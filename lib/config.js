
module.exports = {
    'hostname': 'plex.spiritshare.org',
    'contactmail': 'sendao@gmail.com',
    'gmail_user': 'example@gmail.com',
    'gmail_host': 'smtp.gmail.com',
    'gmail_fullname': 'System Inadministrator',
    'ssl': '/var/rad/.ssl/spirits.pfx',
    'gcmurl': 'https://plex.spiritshare.org/',
    'packages': [ 'plex' ]
};

var x = require('./local-config.js');

for( var i in x ) {
	module.exports[i] = x[i];
}
