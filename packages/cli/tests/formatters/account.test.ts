import { describe, it, expect } from "vitest";
import { formatAccount } from "../../src/formatters/account.js";
import type { AccountExplanation } from "../../src/types/index.js";

const baseAccount: AccountExplanation = {
  account_id: "GDRW2VWJPOB2OQTQMP3ZXPWLF3OGIV5J5NL2M22WRKPPJCMLYJ6",
  summary: "A standard account",
  last_modified_ledger: 48000000,
  subentry_count: 3,
  balances: [],
  signers: [],
};

describe("formatAccount", () => {
  // ── Base fields ────────────────────────────────────────────────

  it("renders base fields (no balances, no signers, no home_domain)", () => {
    const output = formatAccount(baseAccount);

    expect(output).toContain(`Account:     ${baseAccount.account_id}`);
    expect(output).toContain(`Summary:     ${baseAccount.summary}`);
    expect(output).toContain(`Subentries:  ${baseAccount.subentry_count}`);
    expect(output).toContain(`Last ledger: ${baseAccount.last_modified_ledger}`);
    expect(output).not.toContain("Home domain:");
    expect(output).not.toContain("Balances:");
    expect(output).not.toContain("Signers:");
  });

  // ── Home domain ────────────────────────────────────────────────

  it("includes home_domain when present", () => {
    const acc: AccountExplanation = {
      ...baseAccount,
      home_domain: "example.com",
    };

    const output = formatAccount(acc);

    expect(output).toContain("Home domain: example.com");
  });

  it("omits home_domain when undefined", () => {
    const output = formatAccount(baseAccount);

    expect(output).not.toContain("Home domain:");
  });

  // ── Balances table ─────────────────────────────────────────────

  describe("balances", () => {
    it("renders native XLM balance", () => {
      const acc: AccountExplanation = {
        ...baseAccount,
        balances: [{ asset_type: "native", balance: "1000.0000000" }],
      };

      const output = formatAccount(acc);

      expect(output).toContain("Balances:");
      expect(output).toContain("1000.0000000  XLM");
    });

    it("renders non-native asset with code and issuer", () => {
      const acc: AccountExplanation = {
        ...baseAccount,
        balances: [
          {
            asset_type: "credit_alphanum4",
            asset_code: "USDC",
            asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RWMHGLWKGFC3SPY4DD2EKA5IXC",
            balance: "250.5000000",
          },
        ],
      };

      const output = formatAccount(acc);

      expect(output).toContain(
        "250.5000000  USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RWMHGLWKGFC3SPY4DD2EKA5IXC",
      );
    });

    it("renders multiple balances", () => {
      const acc: AccountExplanation = {
        ...baseAccount,
        balances: [
          { asset_type: "native", balance: "500.0000000" },
          {
            asset_type: "credit_alphanum4",
            asset_code: "USDC",
            asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RWMHGLWKGFC3SPY4DD2EKA5IXC",
            balance: "100.0000000",
          },
        ],
      };

      const output = formatAccount(acc);

      const lines = output.split("\n");
      const balanceLines = lines.filter((l) => l.startsWith("  ") && !l.includes("weight="));
      expect(balanceLines).toHaveLength(2);
      expect(balanceLines[0]).toContain("500.0000000  XLM");
      expect(balanceLines[1]).toContain("100.0000000  USDC:");
    });

    it("skips Balances section when array is empty", () => {
      const output = formatAccount(baseAccount);

      expect(output).not.toContain("Balances:");
    });
  });

  // ── Signers table ──────────────────────────────────────────────

  describe("signers", () => {
    it("renders a single signer with weight", () => {
      const acc: AccountExplanation = {
        ...baseAccount,
        signers: [
          {
            key: "GDRW2VWJPOB2OQTQMP3ZXPWLF3OGIV5J5NL2M22WRKPPJCMLYJ6",
            weight: 1,
            type: "ed25519_public_key",
          },
        ],
      };

      const output = formatAccount(acc);

      expect(output).toContain("Signers:");
      expect(output).toContain(
        "GDRW2VWJPOB2OQTQMP3ZXPWLF3OGIV5J5NL2M22WRKPPJCMLYJ6  weight=1",
      );
    });

    it("renders multiple signers", () => {
      const acc: AccountExplanation = {
        ...baseAccount,
        signers: [
          {
            key: "GDRW2VWJPOB2OQTQMP3ZXPWLF3OGIV5J5NL2M22WRKPPJCMLYJ6",
            weight: 10,
            type: "ed25519_public_key",
          },
          {
            key: "GCXKG6RN4RX6MJHJWPCZG4XTV4JP4OWWJAQKQH4YQ2OL2ZUFQ6OU",
            weight: 5,
            type: "ed25519_public_key",
          },
        ],
      };

      const output = formatAccount(acc);

      const lines = output.split("\n");
      const signerLines = lines.filter((l) => l.includes("weight="));
      expect(signerLines).toHaveLength(2);
      expect(signerLines[0]).toContain("weight=10");
      expect(signerLines[1]).toContain("weight=5");
    });

    it("skips Signers section when array is empty", () => {
      const output = formatAccount(baseAccount);

      expect(output).not.toContain("Signers:");
    });
  });

  // ── Full account ───────────────────────────────────────────────

  it("renders a full account with all fields", () => {
    const acc: AccountExplanation = {
      account_id: "GDRW2VWJPOB2OQTQMP3ZXPWLF3OGIV5J5NL2M22WRKPPJCMLYJ6",
      summary: "Multi-sig account with USDC trustline",
      last_modified_ledger: 49000000,
      subentry_count: 5,
      home_domain: "stellar.org",
      balances: [
        { asset_type: "native", balance: "100.0000000" },
        {
          asset_type: "credit_alphanum4",
          asset_code: "USDC",
          asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RWMHGLWKGFC3SPY4DD2EKA5IXC",
          balance: "50.0000000",
        },
      ],
      signers: [
        {
          key: "GDRW2VWJPOB2OQTQMP3ZXPWLF3OGIV5J5NL2M22WRKPPJCMLYJ6",
          weight: 10,
          type: "ed25519_public_key",
        },
        {
          key: "GCXKG6RN4RX6MJHJWPCZG4XTV4JP4OWWJAQKQH4YQ2OL2ZUFQ6OU",
          weight: 5,
          type: "ed25519_public_key",
        },
      ],
    };

    const output = formatAccount(acc);

    // Base fields
    expect(output).toContain(`Account:     ${acc.account_id}`);
    expect(output).toContain(`Summary:     ${acc.summary}`);
    expect(output).toContain(`Subentries:  ${acc.subentry_count}`);
    expect(output).toContain(`Last ledger: ${acc.last_modified_ledger}`);
    expect(output).toContain("Home domain: stellar.org");

    // Balances
    expect(output).toContain("Balances:");
    expect(output).toContain("100.0000000  XLM");
    expect(output).toContain("50.0000000  USDC:");

    // Signers
    expect(output).toContain("Signers:");
    expect(output).toContain("weight=10");
    expect(output).toContain("weight=5");
  });
});
