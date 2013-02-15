var Crawler = require('./lib/Crawler');

var c = new Crawler();

c.loginEagate(EAGATE_ID, EAGATE_PASS, function() {
    console.log('logined');
});

