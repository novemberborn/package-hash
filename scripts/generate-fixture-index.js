'use strict'

const execSync = require('child_process').execSync
const readFileSync = require('fs').readFileSync
const writeFileSync = require('fs').writeFileSync
const join = require('path').posix.join
const resolve = require('path').posix.resolve

const indexFile = resolve(__dirname, '..', 'test', 'fixtures', 'index.json')
const unpackedDir = resolve(__dirname, '..', 'test', 'fixtures', 'unpacked')

const files = {
  'dirty-repo': [
    'package.json',
    '.git/HEAD',
    '.git/refs/heads/master'
  ],
  'fake-repo-parent/fake-repo': [
    'package.json',
    '.git/HEAD'
  ],
  'head-is-a-commit': [
    'package.json',
    '.git/HEAD'
  ],
  'head-is-a-ref': [
    'package.json',
    '.git/HEAD',
    '.git/refs/heads/master'
  ],
  'just-a-package': [
    'package.json'
  ],
  'repo-with-packed-refs': [
    'package.json',
    '.git/HEAD',
    '.git/packed-refs'
  ],
  'repo-without-refs': [
    'package.json',
    '.git/HEAD'
  ]
}

const index = {
  files: Object.keys(files).reduce((acc, fixture) => {
    acc[fixture] = files[fixture].reduce((acc, file) => {
      acc[file] = readFileSync(join(unpackedDir, fixture, file), 'base64')
      return acc
    }, {})
    return acc
  }, {})
}

index.diffs = {
  'dirty-repo': execSync('git --no-pager diff HEAD --no-color --no-ext-diff', {
    cwd: join(unpackedDir, 'dirty-repo'),
    env: Object.assign({}, process.env, {
      GIT_DIR: join(unpackedDir, 'dirty-repo/.git')
    })
  }).toString('base64')
}

writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n')
