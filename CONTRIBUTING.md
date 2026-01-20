Perfect ✅ Here’s a **`CONTRIBUTING.md`** draft in **raw Markdown** you can drop straight into your repo. It’s simple, clear, and contributor-friendly.

---

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

