[![CI](https://github.com/StellarCommons/Stellar-Explain/actions/workflows/ci.yml/badge.svg)](https://github.com/StellarCommons/Stellar-Explain/actions/workflows/ci.yml)
[![Backend](https://img.shields.io/badge/backend-live%20on%20Render-brightgreen)](https://stellar-explain-core.onrender.com/health)

# 🌌 Stellar Explain

**Stellar Explain** is an explainability-first backend for the Stellar blockchain.

It transforms raw Stellar Horizon data into **clear, human-readable explanations**, making transactions easier to understand for developers, analysts, and users — without digging through JSON responses.

This project is designed to grow incrementally, with a strong focus on **clarity, correctness, and contributor experience**.

---

## ✨ Why Stellar Explain?

Most blockchain explorers answer:
> "What happened?"

Stellar Explain answers:
> **"What does this mean?"**

It focuses on:
- Plain-English explanations
- Structured, machine-readable outputs
- Explainability over raw data exposure

---

## 🚀 Live Backend

The Rust backend is deployed and publicly accessible — no local setup required to start contributing to the frontend or CLI:

| Endpoint | URL |
|----------|-----|
| Health check | `GET https://stellar-explain-core.onrender.com/health` |
| Explain transaction | `GET https://stellar-explain-core.onrender.com/tx/:hash` |
| Explain account | `GET https://stellar-explain-core.onrender.com/account/:address` |

**Quick test:**
```bash
curl https://stellar-explain-core.onrender.com/health
# → {"status":"ok","horizon_reachable":true,"version":"..."}

curl https://stellar-explain-core.onrender.com/tx/b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020
```

> The backend runs on Render's free tier and is kept alive with a GitHub Actions keep-alive cron (every 5 min).

---

## 🏗️ Architecture Overview

Stellar Explain is a **monorepo** with three packages:

```
packages/
├── core/     # Rust/Axum backend — the source of truth
├── ui/       # Next.js 15 frontend — proxies all API calls server-side
└── cli/      # Node.js CLI — query the backend from your terminal
```

| Layer | Tech | Role |
|-------|------|------|
| Backend | Rust + Axum | Fetches from Stellar Horizon, produces human-readable JSON |
| Frontend | Next.js 15 | Proxy routes keep the backend URL server-side only |
| CLI | Node.js | `stellar-explain tx <hash>` from your terminal |

### Key principles
- Backend is the primary product
- Frontend consumes the backend API via server-side proxy routes
- Business logic lives outside HTTP handlers
- Explanation logic is deterministic and testable

---

## 🧱 Feature Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Payment transaction explainability (`GET /tx/:hash`) | ✅ Done |
| 1 | Account explainability (`GET /account/:address`) | ✅ Done |
| 2 | Multi-operation transactions | 🚧 Planned |
| 2 | Improved error explanations | 🚧 Planned |
| 3 | Trustlines, account creation, account merge, offers | 🔲 Future |
| 4 | Rich frontend experience & educational UI | 🔲 Future |

---

## 🤝 Contributing

We welcome contributions of all kinds:
- Backend features (Rust)
- Frontend UI (Next.js)
- CLI improvements
- Tests and documentation

**Before contributing:**
- Read [`DEVELOPMENT.md`](./DEVELOPMENT.md) — setup guide, both quick (Render) and local (Rust)
- Read `CONTRIBUTING.md` for workflow guidelines
- Check existing issues and milestones
- Work on issues in dependency order when specified

> All backend issues include tests and clear acceptance criteria.

### 💬 Maintainer Support
Join the Telegram group to ask questions or coordinate with maintainers:  
👉 **https://t.me/+n10W2fqjxBhmNDM0**

---

## 📄 License

MIT License.  
You're free to use, modify, and redistribute this project.

---

## ❤️ Community

Stellar Explain is part of the **StellarCommons** open-source initiative.

We value:
- clarity over cleverness
- small, meaningful contributions
- respectful collaboration
