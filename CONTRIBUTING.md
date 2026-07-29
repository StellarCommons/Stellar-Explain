

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

## 📦 CLI Version Management (Changesets)

The `@stellar-explain/cli` package uses [Changesets](https://github.com/changesets/changesets)
to manage semantic versioning and auto-generate `CHANGELOG.md` entries.

### When do I need a changeset?

Any PR that modifies `packages/cli/` **and** changes the CLI's behaviour
visible to end users needs a changeset. This includes:

| Change type | Semver bump |
|---|---|
| Breaking CLI change (flag removal, output format change) | `major` |
| New command, new option, new feature (backwards-compatible) | `minor` |
| Bug fix, dependency update, documentation only | `patch` |

Pure internal refactors with no observable difference to users do not
require a changeset.

### Step-by-step: adding a changeset to your PR

1. **Install dependencies** (first time only):
   ```bash
   cd packages/cli
   npm install
   ```

2. **Run the interactive prompt** from the CLI package directory:
   ```bash
   cd packages/cli
   npm run changeset
   ```

3. The CLI will ask you:
   - Which package is affected → select `@stellar-explain/cli`
   - What type of bump → `patch`, `minor`, or `major`
   - A short summary of the change (this becomes the changelog entry)

4. A new file is created in `packages/cli/.changeset/` (e.g.
   `packages/cli/.changeset/teal-lions-laugh.md`).
   **Commit this file as part of your PR.**

   ```bash
   git add packages/cli/.changeset/
   git commit -m "chore: add changeset for <your change>"
   ```

5. Open your Pull Request as normal. The changeset file is reviewed along with
   your code.

### Release flow (maintainers only)

When a new version of the CLI is ready for release, a maintainer pushes a
tag matching `cli-v*` (e.g. `cli-v0.1.1`). The
[CLI Publish workflow](.github/workflows/cli-publish.yml) runs automatically:

1. Checks out the tag, installs dependencies, builds the CLI, and runs tests.
2. Publishes `@stellar-explain/cli` to npm using the `NPM_TOKEN` secret.

> The workflow requires one repository secret:
> - `NPM_TOKEN` — a granular npm access token with publish rights for
>   `@stellar-explain/cli`. Add it in **Settings → Secrets and variables →
>   Actions**.

