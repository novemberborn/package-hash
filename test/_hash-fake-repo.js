'use strict'

const resolve = require('path').resolve
const sync = require('..').sync

sync(resolve(__dirname, 'fixtures', 'unpacked', 'fake-repo-parent', 'fake-repo', 'package.json'))
