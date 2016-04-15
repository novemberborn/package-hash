import { execFileSync } from 'child_process'
import { readFileSync, statSync } from 'fs'
import { dirname, join } from 'path'

import md5hex from 'md5-hex'

function tryReadFileSync (file) {
  try {
    return readFileSync(file)
  } catch (err) {
    return null
  }
}

const TEN_MEBIBYTE = 1024 * 1024 * 10

const git = {
  tryGetRef (dir, head) {
    const m = /^ref: (.+)$/.exec(head.toString('utf8').trim())
    if (!m) return null

    return tryReadFileSync(join(dir, '.git', m[1]))
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
          GIT_DIR: join(dir, '.git')
        }),
        // Ignore stderr.
        stdio: ['ignore', 'pipe', 'ignore']
      })
    } catch (err) {
      return null
    }
  }
}

function hashPackage (salt, dir) {
  const inputs = []
  if (salt) inputs.push(salt)
  inputs.push(dir)

  const pkg = readFileSync(join(dir, 'package.json'))
  inputs.push(pkg)

  const head = tryReadFileSync(join(dir, '.git', 'HEAD'))
  if (head) {
    inputs.push(head)

    const packed = tryReadFileSync(join(dir, '.git', 'packed-refs'))
    if (packed) inputs.push(packed)

    const ref = git.tryGetRef(dir, head)
    if (ref) inputs.push(ref)

    const diff = git.tryGetDiff(dir)
    if (diff) inputs.push(diff)
  }

  return md5hex(inputs)
}

let ownHash = null
export function sync (path) {
  if (!ownHash) {
    // Memoize the hash for package-hash itself.
    ownHash = hashPackage(null, __dirname)
  }

  if (path === __dirname) {
    // Don't hash package-hash twice.
    return ownHash
  }

  // Hash the package found at dir, salted with the hash for package-hash.
  if (statSync(path).isDirectory()) {
    return hashPackage(ownHash, path)
  } else {
    return hashPackage(ownHash, dirname(path))
  }
}
