// Need this until @novemberborn/as-i-preach allows t.throwsAsync
/* eslint ava/use-t-well: "off" */
import {randomBytes} from 'crypto'
import {join, resolve as resolvePath} from 'path'

import test from 'ava'
import hasha from 'hasha'

import packageHash from '..'
import {files, diffs} from './fixtures/index.json'

function resolveFixture (...args) {
  return resolvePath(__dirname, 'fixtures', ...args)
}

const projectDir = resolvePath(__dirname, '..')

function bytes (base64) {
  if (typeof base64 === 'undefined') return null

  return Buffer.from(base64, 'base64')
}

const async = (...args) => packageHash(...args).then()

let ownHash = null
test.serial('hashes itself', async t => {
  const [result] = await Promise.all([
    // Run in parallel to provide code coverage to ownHashPromise usage
    async(join(projectDir, 'package.json')),
    async(join(projectDir, 'package.json'))
  ])
  t.true(typeof result === 'string')
  t.true(result.length > 0)
  ownHash = Buffer.from(result, 'hex')
})

test('throws when called with a directory that is not an installed package', async t => {
  const err = await t.throwsAsync(async(resolveFixture('unpacked', 'not-a-package', 'package.json')))
  t.is(err.code, 'ENOENT')
})

test('throws when called with a non-existent path', async t => {
  const err = await t.throwsAsync(async(resolveFixture('does-not-exist', 'package.json')))
  t.is(err.code, 'ENOENT')
})

test('can be called with a file', async t => {
  const dir = resolveFixture('unpacked', 'just-a-package')
  const file = join(dir, 'package.json')
  const actual = await async(file)
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
  test(`salt cannot be ${label}`, async t => {
    const err = await t.throwsAsync(async(projectDir, salt), TypeError)
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
  test(`salt ${label}`, async t => {
    const dir = resolveFixture('unpacked', 'just-a-package')
    const file = join(dir, 'package.json')
    const actual = await async(file, salt)
    const expected = hasha([
      ownHash,
      stringifiedSalt,
      dir,
      bytes(files['just-a-package']['package.json'])
    ], {algorithm: 'sha256'})

    t.true(actual === expected)
  })
})

test('can be called with a list of files', async t => {
  const salt = randomBytes(16)
  const dir = resolveFixture('unpacked', 'head-is-a-commit')
  const file = resolveFixture(dir, 'package.json')
  const dir2 = resolveFixture('unpacked', 'just-a-package')
  const file2 = join(dir2, 'package.json')

  const actual = await async([file, file2], salt)
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
  test(`${fixture} is hashed correctly`, async t => {
    const dir = resolveFixture('unpacked', fixture)
    const actual = await async(join(dir, 'package.json'))
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
