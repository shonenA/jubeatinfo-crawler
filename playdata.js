var Crawler = require('./lib/Crawler');
var fs = require('fs');

var c = new Crawler();
c.getPlaydataSummary(57710029748673);

c.on('playdataSummary.data', function() {
    console.dir(arguments);
});

c.on('playdataSummary.end', function() {
    console.log('end');
});

