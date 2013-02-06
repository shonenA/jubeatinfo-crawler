var fs = require('fs');
var natural = require('natural');

var eagate, atwiki;

fs.readFile('eagate.json', function(err, data) {
    if( err ) { return; }
    eagate = JSON.parse(data);

    fs.readFile('atwiki.json', function(err, data) {
        if( err ) { return; }
        atwiki = JSON.parse(data);

        var ret = join();

        fs.writeFile('join.json', JSON.stringify(ret, null, 2));
    });
});

function join() {
    var ret = [];
    var max;

    console.log(eagate.length + "개 중");

    for( var i in eagate ) {
        max = {val:1000, cur:-1};
        var name = eagate[i].name;
        for( var j in atwiki ) {
            var val = natural.LevenshteinDistance(name, atwiki[j].name);
            if( val < max.val ) {
                max.val = val;
                max.cur = j;
            }
        }

        if( -1 == max.cur ) {
            console.log(name + "빼고");
            continue;
        }

        var matched = atwiki[max.cur];

        ret.push({
            name: name,
            img: eagate[i].url,
            artist: matched.artist,
            bpm: matched.bpm,
            difficulty: matched.difficulty,
            notecount: matched.notecount
        });

        console.log(name, matched.name, max.val, '처리되었고');
    }

    console.log(ret.length + "개 처리 됨");

    return ret.sort(function(a,b){return a.name < b.name ? -1 : 1;});
}

