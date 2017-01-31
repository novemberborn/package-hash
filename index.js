'use strict'

const execFileSync = require('child_process').execFileSync
const fs = require('fs')
const path = require('path')

const md5hex = require('md5-hex')

const PACKAGE_DIR = path.resolve(__dirname)

function tryReadFileSync (file) {
  try {
    return fs.readFileSync(file)
  } catch (err) {
    return null
  }
}

const TEN_MEBIBYTE = 1024 * 1024 * 10

const git = {
  tryGetRef (dir, head) {
    const m = /^ref: (.+)$/.exec(head.toString('utf8').trim())
    if (!m) return null

    return tryReadFileSync(path.join(dir, '.git', m[1]))
  },

  tryGetDiff (dir) {
    if (!execFileSync) return null

    try {
      // Attempt to get consistent output no matter the platform. Diff both
      // staged and unstaged changes.
      return execFileSync('git', ['--no-pager', 'diff', 'HEAD', '--no-color', '--no-ext-diff'], {
        cwd: dir,
        maxBuffer: TEN_MEBIBYTE,
        env: Object.assign({}, process.env, {
          // Force the GIT_DIR to prevent git from diffing a parent repository
          // in case the directory isn't actually a repository.
          GIT_DIR: path.join(dir, '.git')
        }),
        // Ignore stderr.
        stdio: ['ignore', 'pipe', 'ignore']
      })
    } catch (err) {
      return null
    }
  }
}

function addPackageData (inputs, pkgPath) {
  const dir = fs.statSync(pkgPath).isDirectory()
    ? pkgPath
    : path.dirname(pkgPath)
  inputs.push(dir)

  const pkg = fs.readFileSync(path.join(dir, 'package.json'))
  inputs.push(pkg)

  const head = tryReadFileSync(path.join(dir, '.git', 'HEAD'))
  if (head) {
    inputs.push(head)

    const packed = tryReadFileSync(path.join(dir, '.git', 'packed-refs'))
    if (packed) inputs.push(packed)

    const ref = git.tryGetRef(dir, head)
    if (ref) inputs.push(ref)

    const diff = git.tryGetDiff(dir)
    if (diff) inputs.push(diff)
  }
}

function computeHash (paths, pepper, salt) {
  const inputs = []
  if (pepper) inputs.push(pepper)

  if (typeof salt !== 'undefined') {
    if (Buffer.isBuffer(salt) || typeof salt === 'string') {
      inputs.push(salt)
    } else if (typeof salt === 'object' && salt !== null) {
      inputs.push(JSON.stringify(salt))
    } else {
      throw new TypeError('Salt must be an Array, Buffer, Object or string')
    }
  }

  for (const pkgPath of paths) {
    addPackageData(inputs, pkgPath)
  }

  return md5hex(inputs)
}

let ownHash = null
function sync (paths, salt) {
  if (!ownHash) {
    // Memoize the hash for package-hash itself.
    ownHash = new Buffer(computeHash([PACKAGE_DIR]), 'hex')
  }

  if (paths === PACKAGE_DIR && typeof salt === 'undefined') {
    // Special case that allow the pepper value to be obtained. Mainly here for
    // testing purposes.
    return ownHash.toString('hex')
  }

  return Array.isArray(paths)
    ? computeHash(paths, ownHash, salt)
    : computeHash([paths], ownHash, salt)
}
exports.sync = sync
