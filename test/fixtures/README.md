The `packed` directory contains tarballs of the various fixtures. These can be
unpacked using `npm run unpack-fixtures`. They'll be unpacked into the
`unpacked` directory, which is ignored through `.gitignore`.

Use `npm run generate-fixture-index` to generate an index of the fixtures.

To edit fixtures extract them elsewhere on disk, then create a new tarball and
copy it to the `packed` directory. Use `npm test` to test with the new fixture.
Avoid editing files inside the `unpacked` directory, it's erased every time you
use `npm test`.
