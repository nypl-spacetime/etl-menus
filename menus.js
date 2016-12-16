const fs = require('fs')
const path = require('path')
const request = require('request')
const H = require('highland')
// const R = require('ramda')
const JSONStream = require('JSONStream')

const getUrl = (page) => `http://menusgeo.herokuapp.com/api/locations/all/page/${page}`

var requestStream = function (url) {
  return H(request(url))
    .stopOnError(console.error)
    .split()
    .map(JSON.parse)
}

var requestCallback = function (sleep, url, callback) {
  console.log(`\tDownloading ${url} (and sleeping ${sleep} ms)`)

  request(url, function (err, response, body) {
    if (err) {
      callback(err)
    } else {
      if (sleep) {
        setTimeout(() => {
          callback(null, JSON.parse(body))
        }, sleep)
      } else {
        callback(null, JSON.parse(body))
      }
    }
  })
}

var getUrls = function (pages) {
  var urls = []
  for (var page = 1; page <= pages; page++) {
    urls.push(getUrl(page))
  }

  return urls
}

function download (config, dirs, tools, callback) {
  const sleepMs = 2000

  return requestStream(getUrl(1))
    .map((body) => body.total_pages)
    .map(H.curry(getUrls))
    .flatten()
    .map(H.curry(requestCallback, sleepMs))
    .nfcall([])
    .series()
    .flatten()
    .compact()
    .errors(callback)
    .pipe(JSONStream.stringify())
    .on('end', callback)
    .pipe(fs.createWriteStream(path.join(dirs.current, 'menus.json')))
}

function transform (config, dirs, tools, callback) {
  callback()
}

// ==================================== API ====================================

module.exports.steps = [
  download,
  transform
]
