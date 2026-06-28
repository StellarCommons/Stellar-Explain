# Contributing to stellar-explain CLI

## Local Setup

```bash
# From the repo root
npm install
cd packages/cli
npm install
```

## Running Tests

```bash
cd packages/cli
npm test
```

## Coding Conventions

- TypeScript strict mode is enabled — no implicit `any`
- Format with `prettier` before committing (`npm run format`)
- Lint with ESLint (`npm run lint`)
- Each utility lives in `src/utils/`, one concern per file
- New commands go in `src/commands/`

## Submitting a PR

1. Fork the repo and create a branch: `fix/issue-<number>`
2. Make your changes with tests
3. Run `npm test` and `npm run lint`
4. Open a PR against `main` with a description linking the issue

## Reporting Bugs

Use the GitHub issue tracker and fill in the bug report template.
