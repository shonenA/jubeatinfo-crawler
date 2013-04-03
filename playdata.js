var Crawler = require('./lib/Crawler');
var fs = require('fs');
var strftime = require('strftime');
var sqlite = require('sqlite3').verbose();

var Queue = function() {};

Queue.prototype.load = function() {
    var queue = fs.readFileSync('../data/queue', 'ascii');
    queue = queue.split('\n');
    this.queue = [];
    for(var i in queue) {
        if( queue[i] ) this.queue.push(queue[i]);
    }
}

Queue.prototype.save = function() {
    fs.writeFileSync('../data/queue', this.queue.join('\n'));
}

Queue.prototype.pop = function() {
    return this.queue.shift();
}

Queue.prototype.push = function(str) {
    this.queue.push();
}

Queue.prototype.get = function() {
    return this.queue[0];
}

Queue.prototype.length = function() {
    return this.queue.length;
}

var c = new Crawler();

var playdata = {};

c.on('playdataMain.data', function(rivalId, data) {
    playdata[rivalId] = data;
    console.dir(data);
    console.log(rivalId, '메인데이터 수집 끝');
});

c.on('playdataMain.end', function(rivalId) {
    c.getPlaydataSummary(rivalId);
});

c.on('playdataMain.error', function(error, rivalId) {
    c.emit('getPlaydata.end', error, rivalId);
});

c.on('playdataSummary.data', function(rivalId, key, name, bsc, adv, ext) {
    if( !playdata[rivalId].history ) playdata[rivalId].history = {};
    playdata[rivalId].history[key] = {
        key:key, name:name, bsc:bsc, adv:adv, ext:ext
    };
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
                 }).reduce(function(a,b){return a.concat(b);}, []);

    var summaryPath = '../data/summary/' + rivalId;
    if( !fs.existsSync(summaryPath) ) {
        fs.mkdirSync(summaryPath);
    }
    fs.writeFile(summaryPath + '/' + strftime('%Y%m%d') + '.json', JSON.stringify(forInfo));

    // write to db
    var db = new sqlite.Database('../data/jubeatinfo.sqlite3', function() {
        var stmt = null;

        stmt = db.prepare("INSERT OR IGNORE INTO summary VALUES (?, ?, ?, ?, ?, ?)");
        for( var i in forInfo.history ) {
            var h = forInfo.history[i];
            var score = (parseInt(h.score)==h.score)?h.score:0;
            stmt.run(rivalId, h.music, h.difficulty, score, h.fc, h.date);
        }

        stmt.finalize(function() {
            db.close();
        });
    });

    console.log(rivalId + ' 수집 완료');

    playdata[rivalId] = {};

    c.emit('getPlaydata.end', null, rivalId);
});

function getPlaydata() {
    var queue = new Queue();
    queue.load();

    if( queue.length() > 0 ) {
        c.getPlaydataMain(queue.get());
        
        c.once('getPlaydata.end', function(error, rivalId) {
            if( error ) {
                console.error(error);
                setTimeout(function() { process.nextTick(getPlaydata); }, 60000); // 1분 뒤에 다시 큐 감시
                return;
            }

            queue.load();
            if( rivalId != queue.get() ) {
                // XXX ???
                console.error('???');
                return;
            }
            queue.pop();
            queue.save();

            process.nextTick(getPlaydata);
        });
    } else {
        console.log('데이터 없음, 1분동안 기다림');
        setTimeout(function() { process.nextTick(getPlaydata); }, 60000); // 1분 뒤에 다시 큐 감시
    }
}

getPlaydata();

