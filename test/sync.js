import {spawnSync} from 'child_process'
import {randomBytes} from 'crypto'
import {join, resolve as resolvePath} from 'path'

import test from 'ava'
import hasha from 'hasha'

import {sync} from '..'
import {files, diffs} from './fixtures/index.json'

function resolveFixture (...args) {
  return resolvePath(__dirname, 'fixtures', ...args)
}

const projectDir = resolvePath(__dirname, '..')

function bytes (base64) {
  if (typeof base64 === 'undefined') return null

  return Buffer.from(base64, 'base64')
}

let ownHash = null
test.serial('hashes itself', t => {
  const result = sync(join(projectDir, 'package.json'))
  t.true(typeof result === 'string')
  t.true(result.length > 0)
  ownHash = Buffer.from(result, 'hex')
})

test('throws when called with a directory that is not an installed package', t => {
  const err = t.throws(() => sync(resolveFixture('unpacked', 'not-a-package', 'package.json')))
  t.is(err.code, 'ENOENT')
})

test('throws when called with a non-existent path', t => {
  const err = t.throws(() => sync(resolveFixture('does-not-exist', 'package.json')))
  t.is(err.code, 'ENOENT')
})

test('can be called with a file', t => {
  const dir = resolveFixture('unpacked', 'just-a-package')
  const file = join(dir, 'package.json')
  const actual = sync(file)
  const expected = hasha([
    ownHash,
    dir,
    bytes(files['just-a-package']['package.json'])
  ], {algorithm: 'sha256'})

  t.true(actual === expected)
})

;[
  ['null', null],
  ['a number', 42],
  ['a boolean', false],
  ['a function', () => {}]
].forEach(([label, salt]) => {
  test(`salt cannot be ${label}`, t => {
    const err = t.throws(() => sync(projectDir, salt), TypeError)
    t.is(err.message, 'Salt must be an Array, Buffer, Object or string')
  })
})

;[
  ['can be a Buffer', randomBytes(16)],
  ['can be an Array', [{foo: 'bar'}, 'baz'], JSON.stringify([{foo: 'bar'}, 'baz'])],
  ['can be an Object', {foo: 'bar'}, JSON.stringify({foo: 'bar'})],
  ['can be a string', 'foobar'],
  ['is ignored when undefined', undefined, '']
].forEach(([label, salt, stringifiedSalt = salt]) => {
  test(`salt ${label}`, t => {
    const dir = resolveFixture('unpacked', 'just-a-package')
    const file = join(dir, 'package.json')
    const actual = sync(file, salt)
    const expected = hasha([
      ownHash,
      stringifiedSalt,
      dir,
      bytes(files['just-a-package']['package.json'])
    ], {algorithm: 'sha256'})

    t.true(actual === expected)
  })
})

test('can be called with a list of files', t => {
  const salt = randomBytes(16)
  const dir = resolveFixture('unpacked', 'head-is-a-commit')
  const file = join(dir, 'package.json')
  const dir2 = resolveFixture('unpacked', 'just-a-package')
  const file2 = join(dir2, 'package.json')

  const actual = sync([file, file2], salt)
  const expected = hasha([
    ownHash,
    salt,
    dir,
    bytes(files['head-is-a-commit']['package.json']),
    bytes(files['head-is-a-commit']['.git/HEAD']),
    dir2,
    bytes(files['just-a-package']['package.json'])
  ], {algorithm: 'sha256'})

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
    const dir = resolveFixture('unpacked', fixture)
    const actual = sync(join(dir, 'package.json'))
    const expected = hasha([
      ownHash,
      dir,
      bytes(files[fixture]['package.json']),
      bytes(files[fixture]['.git/HEAD']),
      bytes(files[fixture]['.git/packed-refs']),
      bytes(files[fixture]['.git/refs/heads/master']),
      bytes(diffs[fixture])
    ].filter(Boolean), {algorithm: 'sha256'})

    t.true(actual === expected)
  })
})

if (spawnSync) {
  test('diffing should not write to stderr', t => {
    const child = spawnSync(process.execPath, [resolvePath(__dirname, '_hash-fake-repo.js')])
    t.true(child.stderr.toString('utf8') === '')
  })
}
