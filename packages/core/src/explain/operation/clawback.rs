//! Explainer for clawback and clawback_claimable_balance operations.
//!
//! Clawback is a regulated-asset feature that allows an issuer to recover
//! funds from a holder's account. It is often unexpected by the recipient
//! so explanations include contextual information about what clawback means.

use crate::models::operation::{ClawbackOperation, ClawbackClaimableBalanceOperation};
use serde::{Deserialize, Serialize};

/// Human-readable explanation of a clawback operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ClawbackExplanation {
    /// Full natural-language summary with contextual note.
    pub summary: String,

    /// The issuer account that initiated the clawback.
    pub issuer: String,

    /// The account the funds were clawed back from.
    pub from: String,

    /// Asset code (e.g. "USDC").
    pub asset_code: String,

    /// Asset issuer account.
    pub asset_issuer: String,

    /// Amount clawed back.
    pub amount: String,
}

/// Human-readable explanation of a clawback_claimable_balance operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ClawbackClaimableBalanceExplanation {
    /// Full natural-language summary with contextual note.
    pub summary: String,

    /// The issuer account that initiated the clawback.
    pub issuer: String,

    /// The claimable balance ID that was clawed back.
    pub balance_id: String,
}

/// Contextual note appended to all clawback explanations.
const CLAWBACK_CONTEXT: &str = "Clawback is a feature of regulated assets \
that allows issuers to recover funds under specific conditions.";

/// Explain a clawback operation.
///
/// A clawback recovers a specific amount of a regulated asset from a holder's
/// account. The operation is initiated by the asset issuer.
pub fn explain_clawback(op: &ClawbackOperation) -> ClawbackExplanation {
    let issuer = op
        .source_account
        .clone()
        .unwrap_or_else(|| "Unknown issuer".to_string());

    let summary = format!(
        "The asset issuer reclaimed {} {} from {}. {}",
        op.amount, op.asset_code, op.from, CLAWBACK_CONTEXT
    );

    ClawbackExplanation {
        summary,
        issuer,
        from: op.from.clone(),
        asset_code: op.asset_code.clone(),
        asset_issuer: op.asset_issuer.clone(),
        amount: op.amount.clone(),
    }
}

/// Explain a clawback_claimable_balance operation.
///
/// A clawback claimable balance cancels a claimable balance that was created
/// with a regulated asset, before any claimant could claim it.
pub fn explain_clawback_claimable_balance(
    op: &ClawbackClaimableBalanceOperation,
) -> ClawbackClaimableBalanceExplanation {
    let issuer = op
        .source_account
        .clone()
        .unwrap_or_else(|| "Unknown issuer".to_string());

    let short_id = shorten_id(&op.balance_id);

    let summary = format!(
        "The asset issuer clawed back claimable balance {}. {}",
        short_id, CLAWBACK_CONTEXT
    );

    ClawbackClaimableBalanceExplanation {
        summary,
        issuer,
        balance_id: op.balance_id.clone(),
    }
}

/// Shorten a long balance ID for display: "00000000abcd...ef12"
fn shorten_id(id: &str) -> String {
    if id.len() > 16 {
        format!("{}...{}", &id[..8], &id[id.len() - 4..])
    } else {
        id.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::operation::{ClawbackOperation, ClawbackClaimableBalanceOperation};

    fn base_clawback() -> ClawbackOperation {
        ClawbackOperation {
            id: "op1".to_string(),
            source_account: Some("GISSUER123".to_string()),
            from: "GHOLDER456".to_string(),
            asset_code: "USDC".to_string(),
            asset_issuer: "GISSUER123".to_string(),
            amount: "100".to_string(),
        }
    }

    fn base_clawback_balance() -> ClawbackClaimableBalanceOperation {
        ClawbackClaimableBalanceOperation {
            id: "op2".to_string(),
            source_account: Some("GISSUER123".to_string()),
            balance_id: "00000000abcdef1234567890abcdef1234567890abcdef1234567890abcdef12".to_string(),
        }
    }

    // ── clawback ───────────────────────────────────────────────────────────

    #[test]
    fn test_clawback_summary_contains_amount_and_asset() {
        let result = explain_clawback(&base_clawback());
        assert!(result.summary.contains("100"));
        assert!(result.summary.contains("USDC"));
    }

    #[test]
    fn test_clawback_summary_contains_recipient() {
        let result = explain_clawback(&base_clawback());
        assert!(result.summary.contains("GHOLDER456"));
    }

    #[test]
    fn test_clawback_summary_contains_context_note() {
        let result = explain_clawback(&base_clawback());
        assert!(result.summary.contains("regulated assets"));
        assert!(result.summary.contains("issuers to recover funds"));
    }

    #[test]
    fn test_clawback_summary_format() {
        let result = explain_clawback(&base_clawback());
        assert!(result.summary.starts_with("The asset issuer reclaimed 100 USDC from GHOLDER456."));
    }

    #[test]
    fn test_clawback_fields_preserved() {
        let result = explain_clawback(&base_clawback());
        assert_eq!(result.from, "GHOLDER456");
        assert_eq!(result.asset_code, "USDC");
        assert_eq!(result.asset_issuer, "GISSUER123");
        assert_eq!(result.amount, "100");
        assert_eq!(result.issuer, "GISSUER123");
    }

    #[test]
    fn test_clawback_unknown_issuer_fallback() {
        let op = ClawbackOperation {
            source_account: None,
            ..base_clawback()
        };
        let result = explain_clawback(&op);
        assert_eq!(result.issuer, "Unknown issuer");
    }

    #[test]
    fn test_clawback_fractional_amount() {
        let op = ClawbackOperation {
            amount: "0.0000001".to_string(),
            ..base_clawback()
        };
        let result = explain_clawback(&op);
        assert!(result.summary.contains("0.0000001"));
        assert_eq!(result.amount, "0.0000001");
    }

    #[test]
    fn test_clawback_non_usdc_asset() {
        let op = ClawbackOperation {
            asset_code: "BRLUSD".to_string(),
            asset_issuer: "GOTHER".to_string(),
            ..base_clawback()
        };
        let result = explain_clawback(&op);
        assert!(result.summary.contains("BRLUSD"));
        assert_eq!(result.asset_code, "BRLUSD");
    }

    // ── clawback_claimable_balance ─────────────────────────────────────────

    #[test]
    fn test_clawback_claimable_balance_summary_contains_context() {
        let result = explain_clawback_claimable_balance(&base_clawback_balance());
        assert!(result.summary.contains("regulated assets"));
        assert!(result.summary.contains("issuers to recover funds"));
    }

    #[test]
    fn test_clawback_claimable_balance_summary_starts_correctly() {
        let result = explain_clawback_claimable_balance(&base_clawback_balance());
        assert!(result.summary.starts_with("The asset issuer clawed back claimable balance"));
    }

    #[test]
    fn test_clawback_claimable_balance_id_shortened() {
        let result = explain_clawback_claimable_balance(&base_clawback_balance());
        // Full ID should not appear in summary — shortened version should
        assert!(!result.summary.contains("00000000abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"));
        assert!(result.summary.contains("00000000"));
        assert!(result.summary.contains("ef12"));
    }

    #[test]
    fn test_clawback_claimable_balance_full_id_in_field() {
        let result = explain_clawback_claimable_balance(&base_clawback_balance());
        assert_eq!(
            result.balance_id,
            "00000000abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
        );
    }

    #[test]
    fn test_clawback_claimable_balance_issuer_field() {
        let result = explain_clawback_claimable_balance(&base_clawback_balance());
        assert_eq!(result.issuer, "GISSUER123");
    }

    #[test]
    fn test_clawback_claimable_balance_unknown_issuer_fallback() {
        let op = ClawbackClaimableBalanceOperation {
            source_account: None,
            ..base_clawback_balance()
        };
        let result = explain_clawback_claimable_balance(&op);
        assert_eq!(result.issuer, "Unknown issuer");
    }

    #[test]
    fn test_short_balance_id_not_truncated() {
        let op = ClawbackClaimableBalanceOperation {
            balance_id: "shortid".to_string(),
            ..base_clawback_balance()
        };
        let result = explain_clawback_claimable_balance(&op);
        assert!(result.summary.contains("shortid"));
    }
}