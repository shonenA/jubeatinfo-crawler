var Crawler = require('./lib/Crawler');
var fs = require('fs');

var c = new Crawler();
//c.getPlaydataSummary(57710029748673); // SHONEN.A
//c.getPlaydataSummary(57710029256457); // UNUSED
//c.getPlaydataSummary(57710029539329); // KCM1700
//c.getPlaydataSummary(57710029431862); // SGM
//c.getPlaydataSummary(57710029248344); // NTOPIA
//c.getPlaydataSummary(57710026610414); // ARKIND
c.getPlaydataSummary(57710029457573); // FLUEGEL

var playdata = {};

c.on('playdataSummary.data', function(rivalId, key, name, bsc, adv, ext) {
    playdata[key] = {
        key:key, name:name, bsc:bsc, adv:adv, ext:ext
    };
    console.log(name, '수집');
});

function values(a) {
    var r = [];
    for( var i in a ) {
        r.push(a[i]);
    }
    return r;
}

function getDate() {
    var d = new Date();
    return d.getFullYear() + '/' + d.getMonth() + '/' + d.getDay()
        + ' ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
}

c.on('playdataSummary.end', function(rivalId) {
    fs.writeFile(rivalId+'.json', JSON.stringify(playdata, null, 2));

    var date = getDate();
    var forInfo = {
        history: values(playdata).map(function(e){
                 return [
                        {music:e.name, difficulty:"BASIC", score:e.bsc.score, date:date, fc:e.bsc.fc},
                        {music:e.name, difficulty:"ADVANCED", score:e.adv.score, date:date, fc:e.adv.fc},
                        {music:e.name, difficulty:"EXTREME", score:e.ext.score, date:date, fc:e.ext.fc}
                    ]
                 }).reduce(function(a,b){return a.concat(b);}),
        user_name: "SHONEN.A"
    };
    fs.writeFile('../www/data/'+rivalId+'.json', JSON.stringify(forInfo));
    console.log(rivalId + ' 완료');
});

