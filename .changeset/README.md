# Changesets

This repository uses Changesets for releases. Every pull request that changes
`packages/analytics` must add a changeset markdown file in this directory.
This includes bug fixes, public API changes, and package documentation that is
part of a release.

Create one with:

```bash
npm run changeset
```

Select `@stellar-explain/analytics` and choose the appropriate patch, minor, or
major release type. Commit the generated file with the implementation. The
release workflow consumes these files when publishing; do not edit the package
version manually.
