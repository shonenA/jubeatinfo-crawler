var sqlite = require('sqlite3').verbose();
var fs = require('fs');

var rivalId = null;
var path = '../data/summary';

var rivals = fs.readdirSync(path).sort();
var files = null;
var rcur = 0;
var cur = 0;

createDb();

var db;
function createDb() {
    console.log("createDb jubeatinfo");
    db = new sqlite.Database('../data/jubeatinfo.sqlite3', createTable);
}

function createTable() {
    console.log("createTable summary");
    db.run("CREATE TABLE IF NOT EXISTS summary (rivalid INTEGER, music TEXT, difficulty TEXT, score INTEGER, fc INTEGER, date TEXT)", function() {
        db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_score ON summary (rivalid, music, difficulty, score, fc)", function() {
            db.run("PRAGMA synchronous = OFF");
            db.run("PRAGMA journal_mode = MEMORY", prepareRows);
        });
    });
}

function prepareRows() {
    if( rcur >= rivals.length ) {
        process.nextTick(closeDb);
        return;
    }

    rivalId = rivals[rcur];
    files = fs.readdirSync(path + '/' + rivalId).sort();
    rcur++;
    cur = 0;
    process.nextTick(insertRows);
}

function insertRows() {
    if( cur >= files.length ) {
        process.nextTick(prepareRows);
        return;
    }

    console.log("get " + rivalId + ", " + files[cur]);

    var contents = fs.readFileSync(path + '/' + rivalId + '/' + files[cur]);
    contents = JSON.parse(contents);

    console.log("summary " + files[cur]);

    var stmt = null;

    stmt = db.prepare("INSERT OR IGNORE INTO summary VALUES (?, ?, ?, ?, ?, ?)");
    for( var i in contents.history ) {
        var h = contents.history[i];
        var score = (parseInt(h.score)==h.score)?h.score:0;
        stmt.run(rivalId, h.music, h.difficulty, score, h.fc, h.date);
    }

    stmt.finalize(insertRows);
    cur++;
}

function closeDb() {
    db.close();
}


