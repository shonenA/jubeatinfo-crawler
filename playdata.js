var Crawler = require('./lib/Crawler');
var fs = require('fs');
var strftime = require('strftime');

var c = new Crawler();
//c.getPlaydataMain(57710029748673);
c.getPlaydataMain(57710029256457); // UNUSED
//c.getPlaydataSummary(57710029748673); // SHONEN.A
//c.getPlaydataSummary(57710029256457); // UNUSED
//c.getPlaydataSummary(57710029539329); // KCM1700
//c.getPlaydataSummary(57710029431862); // SGM
//c.getPlaydataSummary(57710029248344); // NTOPIA
//c.getPlaydataSummary(57710026610414); // ARKIND
//c.getPlaydataSummary(57710029457573); // FLUEGEL

var playdata = {};

c.on('playdataMain.data', function(rivalId, data) {
    playdata[rivalId] = data;
    console.dir(data);
    console.log(rivalId, '메인데이터 수집 끝');
});

c.on('playdataMain.end', function(rivalId) {
    c.getPlaydataSummary(rivalId);
});

c.on('playdataSummary.data', function(rivalId, key, name, bsc, adv, ext) {
    if( !playdata[rivalId].history ) playdata[rivalId].history = {};
    playdata[rivalId].history[key] = {
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

c.on('playdataSummary.end', function(rivalId) {
    var filename = strftime('%Y%m%d') + '_' + rivalId + '.json';

    fs.writeFile('data/' + filename, JSON.stringify(playdata[rivalId], null, 2));

    var cvtbl = {
        name: 'user_name',
        title: 'title', jubility: 'jubility', jubilityimage: 'jubility_image',
        lastplaytime: 'lastplaytime', lastplayplace: 'lastplayplace',
        rivalId: 'rival_id', activeGroup: 'active_group',
        numPlay: 'count_play', numFc: 'count_fullcombo', numExc: 'count_excellent',
        marker: 'marker', background: 'background',
        tbsRanking: 'tbs_ranking', tbsScore: 'tbs_score'
    };

    var forInfo = {}
    for( var k in cvtbl ) {
        forInfo[cvtbl[k]] = playdata[rivalId][k];
    }

    var date = strftime('%Y-%m-%d %H:%M:%S');
    forInfo.history = values(playdata[rivalId].history).map(function(e){
                 return [
                        {music:e.name, difficulty:"BASIC", score:e.bsc.score, date:date, fc:e.bsc.fc},
                        {music:e.name, difficulty:"ADVANCED", score:e.adv.score, date:date, fc:e.adv.fc},
                        {music:e.name, difficulty:"EXTREME", score:e.ext.score, date:date, fc:e.ext.fc}
                    ]
                 }).reduce(function(a,b){return a.concat(b);});

    fs.writeFile('../www/data/' + filename, JSON.stringify(forInfo));
    console.log(rivalId + ' 완료');
});

