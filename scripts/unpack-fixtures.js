'use strict'

const createReadStream = require('fs').createReadStream
const readdirSync = require('fs').readdirSync
const join = require('path').join
const resolve = require('path').resolve

const rimraf = require('rimraf')
const tar = require('tar')

const unpackedDir = resolve(__dirname, '..', 'test', 'fixtures', 'unpacked')
const packedDir = resolve(__dirname, '..', 'test', 'fixtures', 'packed')

rimraf.sync(unpackedDir)

const files = readdirSync(packedDir)
  .filter(name => /\.tar$/.test(name))
  .map(name => join(packedDir, name))

files.forEach(file => {
  createReadStream(file).pipe(tar.Extract(unpackedDir))
})
