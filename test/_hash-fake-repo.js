'use strict'
// Compatible with Node 0.10
/* eslint-disable no-var */

var resolve = require('path').resolve
var sync = require('../').sync

sync(resolve(__dirname, 'fixtures', 'unpacked', 'fake-repo-parent', 'fake-repo'))
