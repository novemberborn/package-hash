'use strict'

const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const tar = require('tar')

const unpackedDir = path.resolve(__dirname, '..', 'test', 'fixtures', 'unpacked')
const packedDir = path.resolve(__dirname, '..', 'test', 'fixtures', 'packed')

rimraf.sync(unpackedDir)
fs.mkdirSync(unpackedDir)

fs.readdirSync(packedDir)
  .filter(name => /\.tar$/.test(name))
  .map(name => path.join(packedDir, name))
  .forEach(file => {
    tar.extract({cwd: unpackedDir, file, sync: true, strict: true})
  })
