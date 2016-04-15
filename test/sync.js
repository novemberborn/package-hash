import { execFileSync, spawnSync } from 'child_process'
import { join, resolve } from 'path'

import test from 'ava'
import md5hex from 'md5-hex'
import proxyquire from 'proxyquire'

import { sync } from '../'
import { files, diffs } from './fixtures/index.json'

function bytes (base64) {
  if (typeof base64 === 'undefined') return null

  return new Buffer(base64, 'base64')
}

let ownHash = null
test.serial('hashes itself', t => {
  ownHash = sync(resolve('..'))
  t.truthy(ownHash)
})

test('throws when called with a directory that is not an installed package', t => {
  const err = t.throws(() => sync(resolve('fixtures', 'not-a-package')))
  t.is(err.code, 'ENOENT')
})

test('throws when called with a non-existent path', t => {
  const err = t.throws(() => sync(resolve('fixtures', 'does-not-exist')))
  t.is(err.code, 'ENOENT')
})

test('can be called with a directory', t => {
  const dir = resolve('fixtures', 'unpacked', 'just-a-package')
  const actual = sync(dir)
  const expected = md5hex([
    ownHash,
    dir,
    bytes(files['just-a-package']['package.json'])
  ])

  t.true(actual === expected)
})

test('can be called with a file', t => {
  const dir = resolve('fixtures', 'unpacked', 'just-a-package')
  const file = join(dir, 'package.json')
  const actual = sync(file)
  const expected = md5hex([
    ownHash,
    dir,
    bytes(files['just-a-package']['package.json'])
  ])

  t.true(actual === expected)
})

;[
  'dirty-repo',
  'fake-repo-parent/fake-repo',
  'head-is-a-commit',
  'head-is-a-ref',
  'repo-with-packed-refs',
  'repo-without-refs'
].forEach(fixture => {
  test(`${fixture} is hashed correctly`, t => {
    const dir = resolve('fixtures', 'unpacked', fixture)
    const actual = sync(dir)
    const expected = md5hex([
      ownHash,
      dir,
      bytes(files[fixture]['package.json']),
      bytes(files[fixture]['.git/HEAD']),
      bytes(files[fixture]['.git/packed-refs']),
      bytes(files[fixture]['.git/refs/heads/master']),
      execFileSync ? bytes(diffs[fixture]) : null
    ].filter(Boolean))

    t.true(actual === expected)
  })
})

test('does not use the diff if execFileSync is not available', t => {
  const { sync } = proxyquire.noCallThru()('../', {
    child_process: {}
  })
  const ownHash = sync(resolve('..'))

  const dir = resolve('fixtures', 'unpacked', 'dirty-repo')
  const actual = sync(dir)
  const expected = md5hex([
    ownHash,
    dir,
    bytes(files['dirty-repo']['package.json']),
    bytes(files['dirty-repo']['.git/HEAD']),
    bytes(files['dirty-repo']['.git/refs/heads/master'])
  ])

  t.true(actual === expected)
})

if (spawnSync) {
  test('diffing should not write to stderr', t => {
    const child = spawnSync(process.execPath, ['_hash-fake-repo.js'])
    t.true(child.stderr.toString('utf8') === '')
  })
}
