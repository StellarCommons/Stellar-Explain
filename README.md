
[![CI](https://github.com/drip22/Stellar-Explain/actions/workflows/ci.yml/badge.svg)](https://github.com/drip22/Stellar-Explain/actions/workflows/ci.yml)

```md
# 🌌 Stellar Explain

**Stellar Explain** is an explainability-first backend for the Stellar blockchain.

It transforms raw Stellar Horizon data into **clear, human-readable explanations**, making transactions easier to understand for developers, analysts, and users — without digging through JSON responses.

This project is designed to grow incrementally, with a strong focus on **clarity, correctness, and contributor experience**.

---

## ✨ Why Stellar Explain?

Most blockchain explorers answer:
> “What happened?”

Stellar Explain answers:
> **“What does this mean?”**

It focuses on:
- Plain-English explanations
- Structured, machine-readable outputs
- Explainability over raw data exposure

---

## 🧭 Project Status

🚧 **Active Development**

- Backend v1 is in progress
- Scope is intentionally narrow and incremental
- Contributions are welcome

```
## 🏗️ Architecture Overview

Stellar Explain is a **monorepo** with two main packages:
```
---


packages/
├── core/     # Rust backend (source of truth)
└── ui/       # Next.js frontend (consumer of the API)

```

### Key principles
- Backend is the primary product
- Frontend consumes the backend API
- Business logic lives outside HTTP handlers
- Explanation logic is deterministic and testable

---

## 🧱 Feature Roadmap (High Level)

### Phase 1 — Payment Explainability (v1)
- Explain Stellar **payment transactions only**
- Plain-English summaries
- Structured JSON output
- `GET /tx/:hash` API endpoint

### Phase 2
- Multi-operation transactions
- Improved error explanations
- Caching and performance improvements

### Phase 3
- Support for more operation types:
  - Trustlines
  - Account creation
  - Account merge
  - Offers / liquidity pools

### Phase 4
- Rich frontend experience
- Educational UI and contextual explanations
- Ecosystem integrations

---

## 🤝 Contributing

We welcome contributions of all kinds:
- Backend features
- Frontend UI
- Tests
- Documentation

Before contributing:
- Please read `CONTRIBUTING.md`
- Check existing issues and milestones
- Work on issues in order when dependencies exist

> All backend issues include tests and clear acceptance criteria.

### 💬 Maintainer Support
Join the Telegram group to ask questions or coordinate with maintainers:  
👉 **https://t.me/+n10W2fqjxBhmNDM0**

---

## 📄 License

MIT License.  
You’re free to use, modify, and redistribute this project.

---

## ❤️ Community

Stellar Explain is part of the **StellarCommons** open-source initiative.

We value:
- clarity over cleverness
- small, meaningful contributions
- respectful collaboration
