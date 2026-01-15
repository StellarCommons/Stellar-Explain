
````md
# Stellar Explain

**Stellar Explain** is an open-source educational and developer-friendly tool that helps users **understand what is happening on the Stellar blockchain** in simple, human-readable terms.

Instead of raw hashes, JSON blobs, or confusing transaction data, Stellar Explain breaks down **transactions, operations, and accounts** into clear explanations anyone can understand — from beginners to seasoned developers.

---

## 🚀 What Problem Does This Solve?

Stellar data is powerful, but often:
- Hard to read
- Too technical for newcomers
- Scattered across Horizon responses

**Stellar Explain bridges that gap** by turning blockchain activity into meaningful explanations and insights.

---

## ✨ Core Features

- 🔍 **Transaction Explanation**
  - Input a transaction hash and get a clear breakdown of:
    - What happened
    - Who sent what
    - Which assets were involved

- 🧾 **Operation-Level Insights**
  - Payments, trustlines, offers, and more explained in plain language

- 🩺 **Health & API Endpoints**
  - Simple health checks and structured API responses

- ⚡ **Horizon API Integration**
  - Live data fetched directly from Stellar Horizon

- 🧠 **Caching & Performance**
  - Smart caching layer to reduce redundant Horizon calls

- 🛠 **Developer-Friendly Architecture**
  - Clean Rust backend
  - Modular services
  - Built for extension

---

## 🧱 Tech Stack

- **Backend:** Rust
- **Web Framework:** Axum
- **Blockchain API:** Stellar Horizon
- **Async Runtime:** Tokio
- **HTTP Client:** Reqwest
- **Frontend (WIP):** Next.js
- **State Management (Planned):** Zustand

---

## 📂 Project Structure

```text
stellar-explain/
├── core/                 # Rust backend
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── cache/
│   │   └── main.rs
│   └── Cargo.toml
├── web/                  # Frontend (Next.js – coming soon)
└── README.md
````

---

## 🏃‍♂️ Getting Started (Backend)

### 1️⃣ Clone the repository

```bash
git clone https://github.com/StellarCommons/Stellar-Explain.git
cd Stellar-Explain/core
```

### 2️⃣ Run the server

```bash
cargo run
```

### 3️⃣ Test endpoints

```bash
curl http://localhost:3000/health
curl http://localhost:3000/tx/<TRANSACTION_HASH>
```

---

## 🧑‍💻 Contributing

We welcome contributors of all levels.

### Important:

> **Issues are incremental.**
> Please start from the **earliest open issue** and work downward.
> Later issues depend on earlier ones being completed.

### How to contribute:

1. Fork the repo
2. Create a feature branch
3. Pick an issue and comment to claim it
4. Submit a PR with clear commits

---

## Development Principles

* Simple > clever
* Readability > abstraction
* Incremental progress
* Strong foundations before features

---

## Why This Matters

Stellar Explain is not just another explorer — it’s an **educational layer** on top of the Stellar network.

Our goal is to:

* Lower the barrier to blockchain understanding
* Help developers debug faster
* Make Stellar more accessible to everyone

---

## 📜 License

MIT — free to use, modify, and distribute.

---

## 🤝 Community

This project is part of the **StellarCommons** open-source initiative.

