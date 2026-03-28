

````markdown
# Contributing to StellarCommons

First off, thanks for your interest in contributing! 🚀  
This project is open source because we believe in collaboration and community.  
Contributions of all kinds are welcome — from code to docs, design, or testing.

---

## 📌 How to Contribute

1. **Fork the repository** and clone it locally:
   ```bash
   git clone https://github.com/<your-username>/<repo-name>.git
````

2. **Create a new branch** for your work:

   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** in small, logical commits.
4. **Test your changes** locally (Rust, Next.js, or NestJS).
5. **Push to your fork** and open a Pull Request (PR) to `main`.

---

## 🗂 Project Structure

This is a **monorepo** containing multiple packages:

```
packages/
  core/         # Rust backend (transaction explain API)
  frontend/     # Next.js frontend (UI for Stellar Explain)
  web2-backend/ # NestJS backend (Web2 demo service)
```

Each package has its own README and setup instructions.

---

## 🛠 Development Setup

### Rust API (core)

```bash
cd packages/core
cargo run
```

### Next.js Frontend

```bash
cd packages/frontend
npm install
npm run dev
```

---

## 📋 Issues & Workflow

* We use **incremental issues** (like putting on socks before shoes 🧦👟).
* Issues are **numbered sequentially** to build the project step by step.
* Please pick an open issue from GitHub and comment "I’ll take this" before starting.
* If you’re new, check for `good first issue` or `help wanted` labels.

---

## ✅ Pull Request Guidelines

* Keep PRs **focused and small** (1 issue per PR if possible).
* Write a clear description of what you changed.
* Ensure all checks pass (`npm run lint`, `cargo test`, `npm run test`).
* Add/update documentation if your change affects users.

---

## 🌍 Community & Communication

* Discussions happen in GitHub Issues & telegram channel, you can join the community at 👉 https://t.me/+n10W2fqjxBhmNDM0.
* Be respectful and inclusive.
* Ask questions! We’re here to help new contributors.

---

## 🎉 First-Time Contributors

Never contributed to open source before?
Here are some helpful resources:

* [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
* [First Contributions](https://firstcontributions.github.io/)

---

Thanks again for helping make **StellarCommons** better! ✨

---

## 📦 SDK Version Management (Changesets)

The `@stellar-explain/sdk` package uses [Changesets](https://github.com/changesets/changesets)
to manage semantic versioning and auto-generate `CHANGELOG.md` entries.

### When do I need a changeset?

Any PR that modifies `packages/sdk/` **and** changes the public API or behaviour
visible to consumers needs a changeset. This includes:

| Change type | Semver bump |
|---|---|
| Breaking API change (rename, removal, incompatible signature) | `major` |
| New exported symbol, new option, new behaviour (backwards-compatible) | `minor` |
| Bug fix, dependency update, documentation only | `patch` |

Pure internal refactors with no observable difference to consumers do not
require a changeset.

### Step-by-step: adding a changeset to your PR

1. **Install dependencies** (first time only):
   ```bash
   cd packages/sdk
   npm install
   ```

2. **Run the interactive prompt** from the repo root or the SDK directory:
   ```bash
   # from repo root
   npx changeset

   # or from packages/sdk
   npm run changeset
   ```

3. The CLI will ask you:
   - Which package is affected → select `@stellar-explain/sdk`
   - What type of bump → `patch`, `minor`, or `major`
   - A short summary of the change (this becomes the changelog entry)

4. A new file is created in `.changeset/` (e.g. `.changeset/teal-lions-laugh.md`).
   **Commit this file as part of your PR.**

   ```bash
   git add .changeset/
   git commit -m "chore: add changeset for <your change>"
   ```

5. Open your Pull Request as normal. The changeset file is reviewed along with
   your code.

### Release flow (maintainers only)

When PRs with changeset files are merged to `main`, the
[Release workflow](.github/workflows/release.yml) runs automatically:

1. **If unreleased changesets exist** — the workflow opens (or updates) a
   "Version Packages" PR that bumps `packages/sdk/package.json` and prepends
   entries to `packages/sdk/CHANGELOG.md`.

2. **When the "Version Packages" PR is merged** — the workflow runs
   `changeset publish`, which tags the commit and publishes
   `@stellar-explain/sdk` to npm.

> The workflow requires two repository secrets:
> - `GITHUB_TOKEN` — provided automatically by GitHub Actions.
> - `NPM_TOKEN` — a granular npm access token with publish rights for
>   `@stellar-explain/sdk`. Add it in **Settings → Secrets and variables →
>   Actions**.

