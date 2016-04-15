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
  const pkg = readFileSync(join(dir, 'package.json'))
  const head = tryReadFileSync(join(dir, '.git', 'HEAD'))
  const packed = tryReadFileSync(join(dir, '.git', 'packed-refs'))
  const ref = head ? git.tryGetRef(dir, head) : null
  const diff = head ? git.tryGetDiff(dir) : null

  return md5hex([salt, dir, pkg, head, packed, ref, diff].filter(Boolean))
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
