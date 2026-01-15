
```markdown
# 🌌 Stellar Explain

A developer-centric, human-friendly explorer for the **Stellar blockchain** that turns raw transaction data into clear, concise, plain-English explanations.  
Stellar Explain helps developers, analysts, and users understand what happens on the Stellar network without digging through raw Horizon JSON responses.

---

## Overview

Stellar Explain fetches transactions and account data from the Stellar Horizon API and transforms them into an easy-to-read format.  
This project combines a **Rust backend** with an optional **Next.js frontend UI** to deliver real-time insights about Stellar transactions and accounts.

Unlike standard blockchain explorers, Stellar Explain focuses on **explainability**, making Stellar data accessible to both technical and non-technical audiences.

---

## Features

### Core API Services
- Fetch and explain transactions by hash.
- Interpret operations into human-readable text.
- Retrieve and summarize account balances and histories.

### User-Friendly Output
- Plain English transaction summaries.
- Organized operation breakdowns (payment, trustline, offers, etc.).
- Structured JSON for API consumers.

### Modern Tech Stack
- **Rust** with `axum`: fast, safe, async backend
- **Tokio**: high-performance async runtime
- **Reqwest**: HTTP client for Horizon
- **Next.js (frontend)**: interactive UI for users
- Caching and rate limiting for performance and stability

---

## Architecture

```

stellar-explain/
├── core/                     # Rust backend source
│   ├── src/
│   │   ├── routes/
│   │   ├── services/         # Horizon and explain logic
│   │   ├── cache/            # In-memory caching
│   │   └── main.rs
│   └── Cargo.toml
├── ui/                      # Next.js frontend (optional)
│   ├── app/
│   ├── components/
│   └── package.json
├── docs/
├── .github/                  # CI/CD + issue templates
├── README.md
└── LICENSE

````

---

## Quick Start

### Requirements
- Rust 1.70+ installed
- Cargo (Rust package manager)
-  npm  (for frontend)

---

### Backend Setup (Rust)

#### 1. Clone the repository
```bash
git clone https://github.com/StellarCommons/Stellar-Explain.git
cd Stellar-Explain/core
````

#### 2. Run the server

```bash
cargo run
```

#### 3. Test key endpoints

```bash
# Health check
curl http://localhost:3000/health

# Transaction explain
curl http://localhost:3000/tx/<TRANSACTION_HASH>
```

---

### Frontend ( Next.js)

```bash
cd Stellar-Explain/ui
npm install
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🛠️ Contribution Guide

We welcome contributions of all kinds — backend enhancements, frontend features, testing, docs, and more.

### Before you start

👉 **Work on issues in order**, as many backend features are incremental and build on previous ones.

### How to contribute

1. Fork the repo
2. Create a feature branch:

   ```bash
   git checkout -b feature/my-awesome-change
   ```
3. Commit your changes and push
4. Open a Pull Request with a clear description

---

## Best Practices

* Run tests locally with `cargo test`
* Keep log output readable and actionable
* Handle errors gracefully with structured responses
* Document new features clearly

---

## License

Licensed under the **MIT License** — feel free to use, modify, and redistribute.

---

## ❤️ Community

Part of the **StellarCommons** open-source initiative.
Join our Discord/Telegram channels for active discussions and help.

---

[1]: https://github.com/Crossmint/stellar-smart-account?utm_source=chatgpt.com "GitHub - Crossmint/stellar-smart-account"
