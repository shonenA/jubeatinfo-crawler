#!/home/hitel00000/bin/node

var fs = require('fs'),
    iconv = require('iconv'),
    cheerio = require('cheerio');

fs.readFile('ranking2.html', 'binary', function(err, data) {
    var cv = new iconv.Iconv('CP932', 'UTF-8');
    var cvData = cv.convert(new Buffer(data, 'binary')).toString();
    var $ = cheerio.load(cvData);
    $('tr').each(function(i, elem) {
        console.log($(this).find('.mname').text().trim() + $(this).find('img').attr('src'));
    });
});

