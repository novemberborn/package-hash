'use strict'
// Compatible with Node 0.10
/* eslint-disable no-var */

var createReadStream = require('fs').createReadStream
var readdirSync = require('fs').readdirSync
var join = require('path').join
var resolve = require('path').resolve

var rimraf = require('rimraf')
var tar = require('tar')

var unpackedDir = resolve(__dirname, '..', 'test', 'fixtures', 'unpacked')
var packedDir = resolve(__dirname, '..', 'test', 'fixtures', 'packed')

rimraf.sync(unpackedDir)

var files = readdirSync(packedDir)
  .filter(function (name) { return /\.tar$/.test(name) })
  .map(function (name) { return join(packedDir, name) })

files.forEach(function (file) {
  createReadStream(file).pipe(tar.Extract(unpackedDir))
})
