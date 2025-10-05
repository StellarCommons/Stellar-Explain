# Stellar Explain 🌍✨

**Stellar Explain** is an open-source tool that makes Stellar blockchain transactions human-readable. It decodes raw transaction data into plain English, helping both developers and everyday users understand who sent what, when, and why.

## Structure
- **packages/core** → **Rust backend** (transaction parser & REST API)
- **packages/ui** → **Next.js frontend** for displaying decoded transactions
- **docs** → Project documentation & guides

***

## Features 🚀
* **Human-Readable Output:** Converts complex XDR (External Data Representation) and base64 transaction data into simple, understandable sentences.
* **Multi-Operation Support:** Decodes all standard Stellar operations (Payment, ManageData, ChangeTrust, etc.).
* **RESTful API:** Provides a clean API endpoint for easy integration into wallets, explorers, or other tools.
* **Intuitive UI:** A user-friendly web interface for direct copy-pasting and visualization of transaction details.
* **Open Source:** Built with Rust and Next.js, encouraging community contributions and transparency.

***

## Getting Started

### Prerequisites

You need **Node.js** (v18+) and **Rust** (stable) installed to run the full stack locally.

### Local Development Setup

1.  Clone the repo:
    ```bash
    git clone [https://github.com/StellarCommons/stellar-explain.git](https://github.com/StellarCommons/stellar-explain.git)
    cd stellar-explain
    ```

2.  **Start the Rust Backend (Core API):**
    The core service handles transaction parsing and exposes a REST API (default port: `3000`).
    ```bash
    # Navigate to the core directory
    cd packages/core

    # Build and run the service
    cargo run

    # The API is now running at http://localhost:3000
    cd ../.. # Return to the root directory
    ```

3.  **Start the Next.js Frontend (UI):**
    The UI serves the web interface and communicates with the core API.
    ```bash
    # Install dependencies for the workspace
    npm install

    # Navigate to the UI directory
    cd packages/ui

    # Start the development server
    npm run dev

    # The UI is now running at http://localhost:3001 (or as indicated by Next.js)
    ```

***

## Using Docker 🐳

The easiest way to run the entire service is using Docker Compose.

1.  Ensure you have **Docker** and **Docker Compose** installed.
2.  Build and start the services from the root directory:

    ```bash
    docker compose up --build
    ```

3.  The service will be accessible at `http://localhost:3000`.

***

## Contributing 🤝

We welcome contributions! Whether it's adding a new feature, fixing a bug, or improving documentation, your help is appreciated.

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'feat: add amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.
