jubeatinfo-crawler
==================

## Prerequisite
* [Node.js](http://nodejs.org) > 0.8

## Installation
```bash
cd /path/to/your/jubeatinfo/root
git checkout git://github.com/shonenA/jubeatinfo-crawler crawler
cd crawler
npm install
```

## Configuration
```bash
cd /path/to/your/jubeatinfo/root
mkdir data
cd data
touch queue
mkdir summary
```

## Running
```bash
cd /path/to/your/jubeatinfo/root/crawler
node playdata.js
```

## Batch Jobs
```bash
node musiclist.js
node join.js
```

