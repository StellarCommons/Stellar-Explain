import { describe, it, expect } from "vitest";
import { formatTransaction } from "../../src/formatters/transaction.js";
import { formatAccount } from "../../src/formatters/account.js";
import type { TransactionExplanation, AccountExplanation } from "../../src/types/index.js";

const baseTx: TransactionExplanation = {
  hash: "abc123def456",
  summary: "Payment of 100 XLM from Alice to Bob",
  status: "success",
  ledger: 48000000,
  created_at: "2025-01-01T00:00:00Z",
  fee_charged: "100",
  memo: null,
  payments: [],
  skipped_operations: 0,
};

const baseAccount: AccountExplanation = {
  account_id: "GDRW2VWJPOB2OQTQMP3ZXPWLF3OGIV5J5NL2M22WRKPPJCMLYJ6",
  summary: "A standard account",
  last_modified_ledger: 48000000,
  subentry_count: 3,
  balances: [],
  signers: [],
};

describe("formatter snapshots", () => {
  describe("formatTransaction", () => {
    it("matches snapshot for a minimal transaction", () => {
      expect(formatTransaction(baseTx)).toMatchSnapshot();
    });

    it("matches snapshot with memo and payments", () => {
      const tx: TransactionExplanation = {
        ...baseTx,
        memo: "invoice-42",
        payments: [{ from: "GABC", to: "GXYZ", amount: "100.0000000", asset: "XLM", summary: "Payment" }],
      };
      expect(formatTransaction(tx)).toMatchSnapshot();
    });

    it("matches snapshot with skipped operations", () => {
      expect(formatTransaction({ ...baseTx, skipped_operations: 2 })).toMatchSnapshot();
    });
  });

  describe("formatAccount", () => {
    it("matches snapshot for a minimal account", () => {
      expect(formatAccount(baseAccount)).toMatchSnapshot();
    });

    it("matches snapshot with balances and signers", () => {
      const acc: AccountExplanation = {
        ...baseAccount,
        home_domain: "stellar.org",
        balances: [
          { asset_type: "native", balance: "100.0000000" },
          { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "GABC", balance: "50.0000000" },
        ],
        signers: [
          { key: "GDRW2VWJPOB2OQTQMP3ZXPWLF3OGIV5J5NL2M22WRKPPJCMLYJ6", weight: 1, type: "ed25519_public_key" },
        ],
      };
      expect(formatAccount(acc)).toMatchSnapshot();
    });
  });
});
