var http = require('http');
var https = require('https');
var url = require('url');
var querystring = require('querystring');

var EventEmitter = require('events').EventEmitter;

var fs = require('fs'),
    util = require('util'),
    iconv = require('iconv'),
    cheerio = require('cheerio');

var Cookie = {
    get: function() {
        data = fs.readFileSync('cookie', 'ascii');
        data = data.split('\t');
        if( !data[1] || data[1] < new Date().getTime()/1000 ) {
            return null;
        }
        return data[0];
    },
    set: function(data, expire) {
        fs.writeFileSync('cookie', [data,expire].join('\t'));
    }
}

// private methods
function downloadFromOpt(opt, callback) {
    if( !opt.hostname ) return;

    var buffer = new Buffer('', 'binary');

    var req = http.request(opt, function(res) {
            res.on('data', function(chunk) {
                buffer = Buffer.concat([buffer, new Buffer(chunk, 'binary')]);
            }).on('end', function() {
                callback.call(null, buffer);
            });
        });

    req.end();
}

function download(urlStr, headers, callback) {
    if( 'undefined' == typeof callback ) callback = headers;

    var opt = url.parse(urlStr);
    if( 'object' == typeof headers ) {
        for( var k in headers ) {
            if( !opt.headers ) opt.headers = {};
            opt.headers[k] = headers[k];
        }
    }
    
    downloadFromOpt(opt, callback);
}


// module definition
var Crawler = function() { }

util.inherits(Crawler, EventEmitter);

Crawler.prototype.download = function(url, header, callback) {
    download(url, header, callback);
}

Crawler.prototype.loadCookie = function() {
    return this.cookie = Cookie.get();
}

Crawler.prototype.loginEagate = function(id, password, callback) {
    var self = this;

    function getCookie(callback) {
        console.log('Getting Cookie....');
        var urlStr = 'https://p.eagate.573.jp/gate/p/login.html';
        var opt = url.parse(urlStr);

        var req = https.request(opt, function(res) {
            if( res.headers['set-cookie'] ) {
                console.log('cookie received', res.headers['set-cookie']);
                data = res.headers['set-cookie'][0].split('; ');
                cookie = data[0];
                expire = new Date(data[1].split('=')[1]).getTime()/1000;
                Cookie.set(cookie, expire);
                callback.call(null);
            }
        });
        req.end();
    }

    function doLogin() {
        var postData = querystring.stringify({KID:id,pass:password,OTP:''});
        var urlStr = 'https://p.eagate.573.jp/gate/p/login.html';
        var opt = url.parse(urlStr);

        opt.method = 'POST';
        opt.headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length,
            'Cookie': Cookie.get()
        };

        var req = https.request(opt, function(res) {
            if( res.statusCode == 302 && callback ) {
                callback.call(null);
            }
        });

        req.write(postData);
        req.end();
    }

    getCookie(doLogin);
}

Crawler.prototype.iconv = function(from, to, data) {
    // input data : 'binary' Buffer
    // output data : converted string
    var cv = new iconv.Iconv(from, to);
    var cvData = cv.convert(new Buffer(data, 'binary')).toString();
    return cvData;
}

Crawler.prototype.getEagateMusicList = function() {
    var self = this;
    var baseurl = 'http://p.eagate.573.jp';
    var musicurl = baseurl + '/game/jubeat/saucer/p/ranking/ranking3.html?page=';

    var length = 5;
    var count = 0;
    for(var i = 1; i <= length; i++) {
        this.download(musicurl + i, {}, function(data) {
            var $ = cheerio.load(self.iconv('CP932', 'UTF-8', data));
            $('tr').each(function(i, elem) {
                self.emit('music.data', $(this).find('.mname').text().trim(),
                    url.resolve(musicurl + i, $(this).find('img').attr('src')));
            });

            if( ++count >= length ) {
                self.emit('music.end');
            }
        });
    }
}

Crawler.prototype.getAtwikiMusicList = function() {
    var self = this;
    var wikiurl = 'http://www26.atwiki.jp/jubeat/pages/942.html';

    this.download(wikiurl, {}, function(data) {
        var $ = cheerio.load(data.toString());
        $('tr').each(function(i,e) {
            if($(e).find('td').length==10) {
                var info = $(e).find('td').map(function(i,e){return $(e).text().trim()});

                var difficulty = {
                    'bsc': info[3],
                    'adv': info[4],
                    'ext': info[5]
                };

                var notecount = {
                    'bsc': info[6],
                    'adv': info[7],
                    'ext': info[8]
                }

                self.emit('atwiki.data',
                    info[0], info[1], info[2], difficulty, notecount);
            }
        });
        self.emit('atwiki.end');
    });
}


Crawler.prototype.getPlaydata = function(rivalId) {
    // crawl main
    // crawl summary data
    // crawl data per music
}

Crawler.prototype.getPlaydataMain = function(rivalId) {
    this.loadCookie();

    var self = this;
    var playdatamainUrl = 'http://p.eagate.573.jp/game/jubeat/saucer/p/playdata/index_other.html?';
    var query = querystring.stringify({'rival_id':rivalId});
    playdatamainUrl = playdatamainUrl + query;
    this.download(playdatamainUrl, {Cookie: this.cookie}, function(data) {
        $ = cheerio.load(self.iconv('CP932', 'UTF-8', data));

        if( $('.login').length > 0 ) {
            console.log('로그인 안됨...');
            return;
        }

        if( 'メンテナンス中です' == $('.error_title').text() ) {
            self.emit('playdataMain.error', '이엄게 점검중', rivalId);
            return;
        }

        var userdata = {};
        userdata.name = $('#pname span').eq(1).text().trim();
        userdata.title = $('#pname span').eq(0).text().trim();
        userdata.jubility = parseFloat($('#playdata_info table .top .right').text().trim());
        userdata.jubilityimage = url.resolve(playdatamainUrl, $('#playdata_info_left img').eq(0).attr('src'));

        var lastplay = $('#playdata_info table .bottom div').text().trim();
        lastplay = /^最終プレー日時：([\d\/]+( [\d]+:[\d]+)?)[\s]+(.*)$/.exec(lastplay);
        userdata.lastplaytime = lastplay[1];
        userdata.lastplayplace = lastplay[3];

        userdata.rivalId = $('#rival_id').text().trim();
        userdata.activeGroup = $('#active_group').text().trim();

        userdata.numPlay = parseInt($('#play_detail tr').eq(0).find('.right').text());
        userdata.numFc = parseInt($('#play_detail tr').eq(1).find('.right').text());
        userdata.numExc = parseInt($('#play_detail tr').eq(2).find('.right').text());

        userdata.marker = url.resolve(playdatamainUrl, $('#marker img').eq(1).attr('src'));
        userdata.background = url.resolve(playdatamainUrl, $('#background img').eq(1).attr('src'));

        userdata.tbsRanking = parseInt($('#ranking').text().trim());
        try {
            userdata.tbsScore = parseInt(/^TOTAL BEST SCORE : ([\d]+)$/.exec($('#score').text().trim())[1]);
        } catch(e) {
            userdata.tbsScore = '-';
        }

        self.emit('playdataMain.data', rivalId, userdata);
        self.emit('playdataMain.end', rivalId);
    });
}

Crawler.prototype.getPlaydataSummary = function(rivalId) {
    this.loadCookie();

    var self = this;
    var url = 'http://p.eagate.573.jp/game/jubeat/saucer/p/playdata/music.html?';

    var length = 5;
    var count = 0;
    for(var i = 1; i <= length; i++) {
        var query = querystring.stringify({'rival_id':rivalId,page:i});
        this.download(url + query, {Cookie: this.cookie}, function(data) {
            $ = cheerio.load(self.iconv('CP932', 'UTF-8', data));
            $('#music_data .odd,#music_data .even').each(function(i, e) {
                e = $(e);
                var key = e.find('.jacket img').attr('src').split('jacket')[1];
                var name = e.find('.mname').text().trim();
                var bsc = e.find('td').eq(2);
                bsc = {score:bsc.text().trim(),fc:bsc.find('.fc1').length};
                var adv = e.find('td').eq(3);
                adv = {score:adv.text().trim(),fc:adv.find('.fc1').length};
                var ext = e.find('td').eq(4);
                ext = {score:ext.text().trim(),fc:ext.find('.fc1').length};

                self.emit('playdataSummary.data', rivalId, key, name, bsc, adv, ext);
            });

            if( ++count >= length )
                self.emit('playdataSummary.end', rivalId);
        });
    }
}

Crawler.prototype.getPlaydataDetail = function(rivalId, musicId) {
    this.loadCookie();

    var self = this;
    var url = 'http://p.eagate.573.jp/game/jubeat/saucer/p/playdata/music_detail.html?';
    var query = querystring.stringify({'rival_id':rivalId,mid:musicId});
    this.download(url + query, {Cookie: this.cookie}, function(data) {
        $ = cheerio.load(self.iconv('CP932', 'UTF-8', data));
    });
}


module.exports = Crawler;

