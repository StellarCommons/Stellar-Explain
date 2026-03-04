export const FEATURES = [
  {
    label: "Payments",
    desc: "XLM and custom asset transfers between accounts",
  },
  {
    label: "Accounts",
    desc: "Balances, trust lines, signers, flags, and home domain",
  },
  {
    label: "Set Options",
    desc: "Account configuration changes decoded line by line",
  },
  {
    label: "Create Account",
    desc: "New account funding and activation events",
  },
  { label: "Change Trust", desc: "Asset trust line additions and removals" },
  { label: "Clawback", desc: "Regulated asset recovery operations explained" },
];

export const STEPS = [
  {
    n: "01",
    title: "Paste a hash or address",
    body: "Copy any transaction hash or account address from your wallet, exchange, or block explorer.",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "Hit Explain",
    body: "Stellar Explain fetches the data from the Stellar network and processes each operation in real time.",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m10 15 5-3-5-3v6z" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Read plain English",
    body: "Every operation is translated into a clear, human-readable explanation — no blockchain knowledge needed.",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];