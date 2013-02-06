var fs = require('fs');
var Crawler = require('./lib/Crawler');

var c = new Crawler();

var eagatedata = [];

c.getEagateMusicList();

c.on('music.data', function(name, url) {
    eagatedata.push({name:name,url:url});
});

c.on('music.end', function() {
    fs.writeFile('eagate.json', JSON.stringify(eagatedata));
});


var atwikidata = [];

c.getAtwikiMusicList();

c.on('atwiki.data', function(name, artist, bpm, difficulty, notecount) {
    atwikidata.push({name:name,artist:artist,bpm:bpm,difficulty:difficulty,notecount:notecount});
});

c.on('atwiki.end', function() {
    fs.writeFile('atwiki.json', JSON.stringify(atwikidata));
});

