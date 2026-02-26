//! Explainer for set_options operations.
//!
//! set_options can change many account settings in one operation.
//! This module enumerates every field that was set and assembles
//! them into a single readable summary.

use crate::models::operation::SetOptionsOperation;
use serde::{Deserialize, Serialize};

/// Human-readable explanation of a set_options operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SetOptionsExplanation {
    /// Full natural-language summary of what changed.
    /// e.g. "GAAAA updated their account: set home domain to example.com,
    ///        and added signer GBBB...YYYY with weight 1"
    pub summary: String,

    /// The account that submitted the operation. "Unknown" if not present.
    pub account: String,

    /// One entry per modified field.
    /// e.g. ["set home domain to example.com", "added signer GBBB...YYYY with weight 1"]
    pub changes: Vec<String>,
}

/// Produce a human-readable explanation for a set_options operation.
pub fn explain_set_options(op: &SetOptionsOperation) -> SetOptionsExplanation {
    let account = op
        .source_account
        .clone()
        .unwrap_or_else(|| "Unknown".to_string());

    let mut changes: Vec<String> = Vec::new();

    // Inflation destination
    if let Some(ref dest) = op.inflation_dest {
        changes.push(format!("set inflation destination to {}", dest));
    }

    // Master key weight
    if let Some(weight) = op.master_weight {
        if weight == 0 {
            changes.push("disabled the master key".to_string());
        } else {
            changes.push(format!("set master key weight to {}", weight));
        }
    }

    // Thresholds
    if let Some(low) = op.low_threshold {
        changes.push(format!("set low threshold to {}", low));
    }
    if let Some(med) = op.med_threshold {
        changes.push(format!("set medium threshold to {}", med));
    }
    if let Some(high) = op.high_threshold {
        changes.push(format!("set high threshold to {}", high));
    }

    // Home domain
    if let Some(ref domain) = op.home_domain {
        if domain.is_empty() {
            changes.push("cleared the home domain".to_string());
        } else {
            changes.push(format!("set home domain to {}", domain));
        }
    }

    // Flags
    if let Some(flags) = op.set_flags {
        if flags > 0 {
            changes.push(format!(
                "enabled account flag(s): {}",
                describe_flags(flags)
            ));
        }
    }
    if let Some(flags) = op.clear_flags {
        if flags > 0 {
            changes.push(format!(
                "disabled account flag(s): {}",
                describe_flags(flags)
            ));
        }
    }

    // Signer — weight 0 means remove, anything else means add/modify
    if let Some(ref key) = op.signer_key {
        let short_key = shorten_key(key);
        match op.signer_weight {
            Some(0) => {
                changes.push(format!("removed signer {}", short_key));
            }
            Some(weight) => {
                changes.push(format!(
                    "added signer {} with weight {}",
                    short_key, weight
                ));
            }
            None => {
                changes.push(format!("modified signer {}", short_key));
            }
        }
    }

    let summary = build_summary(&account, &changes);

    SetOptionsExplanation {
        summary,
        account,
        changes,
    }
}

/// Build the final summary string.
fn build_summary(account: &str, changes: &[String]) -> String {
    if changes.is_empty() {
        return format!(
            "{} submitted a set_options operation with no recognised changes.",
            account
        );
    }
    format!("{} updated their account: {}", account, join_changes(changes))
}

/// Join change descriptions into natural English.
///   1 item  → "a"
///   2 items → "a and b"
///   3+      → "a, b, and c"
fn join_changes(changes: &[String]) -> String {
    match changes.len() {
        0 => String::new(),
        1 => changes[0].clone(),
        2 => format!("{} and {}", changes[0], changes[1]),
        _ => {
            let all_but_last = changes[..changes.len() - 1].join(", ");
            format!("{}, and {}", all_but_last, changes[changes.len() - 1])
        }
    }
}

/// Translate Stellar account flag bitmasks into readable names.
/// AUTH_REQUIRED=1, AUTH_REVOCABLE=2, AUTH_IMMUTABLE=4, CLAWBACK_ENABLED=8
fn describe_flags(flags: u32) -> String {
    let mut names: Vec<&str> = Vec::new();
    if flags & 1 != 0 { names.push("AUTH_REQUIRED"); }
    if flags & 2 != 0 { names.push("AUTH_REVOCABLE"); }
    if flags & 4 != 0 { names.push("AUTH_IMMUTABLE"); }
    if flags & 8 != 0 { names.push("CLAWBACK_ENABLED"); }
    if names.is_empty() {
        flags.to_string()
    } else {
        names.join(", ")
    }
}

/// Shorten a long Stellar key for display: "GABC...WXYZ"
fn shorten_key(key: &str) -> String {
    if key.len() > 12 {
        format!("{}...{}", &key[..4], &key[key.len() - 4..])
    } else {
        key.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::operation::SetOptionsOperation;

    fn base_op() -> SetOptionsOperation {
        SetOptionsOperation {
            id: "op1".to_string(),
            source_account: Some("GAAAA...ZZZZ".to_string()),
            ..Default::default()
        }
    }

    // ── Single change ──────────────────────────────────────────────────────

    #[test]
    fn test_single_home_domain() {
        let op = SetOptionsOperation {
            home_domain: Some("example.com".to_string()),
            ..base_op()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.changes.len(), 1);
        assert!(result.changes[0].contains("example.com"));
        assert!(result.summary.contains("set home domain to example.com"));
        assert!(result.summary.contains("updated their account"));
    }

    #[test]
    fn test_single_inflation_dest() {
        let op = SetOptionsOperation {
            inflation_dest: Some("GBBBBB...YYYY".to_string()),
            ..base_op()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.changes.len(), 1);
        assert!(result.changes[0].contains("inflation destination"));
    }

    #[test]
    fn test_single_master_weight() {
        let op = SetOptionsOperation {
            master_weight: Some(5),
            ..base_op()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.changes.len(), 1);
        assert!(result.changes[0].contains("master key weight to 5"));
    }

    #[test]
    fn test_master_weight_zero_disables_key() {
        let op = SetOptionsOperation {
            master_weight: Some(0),
            ..base_op()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.changes.len(), 1);
        assert!(result.changes[0].contains("disabled the master key"));
    }

    #[test]
    fn test_home_domain_cleared() {
        let op = SetOptionsOperation {
            home_domain: Some("".to_string()),
            ..base_op()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.changes.len(), 1);
        assert!(result.changes[0].contains("cleared the home domain"));
    }

    // ── Signer tests ───────────────────────────────────────────────────────

    #[test]
    fn test_signer_added() {
        let op = SetOptionsOperation {
            signer_key: Some("GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB".to_string()),
            signer_weight: Some(1),
            ..base_op()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.changes.len(), 1);
        assert!(result.changes[0].contains("added signer"));
        assert!(result.changes[0].contains("weight 1"));
    }

    #[test]
    fn test_signer_removed_weight_zero() {
        let op = SetOptionsOperation {
            signer_key: Some("GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC".to_string()),
            signer_weight: Some(0),
            ..base_op()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.changes.len(), 1);
        assert!(result.changes[0].contains("removed signer"));
    }

    // ── Multiple changes ───────────────────────────────────────────────────

    #[test]
    fn test_two_changes_joined_with_and() {
        let op = SetOptionsOperation {
            home_domain: Some("stellar.org".to_string()),
            low_threshold: Some(1),
            ..base_op()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.changes.len(), 2);
        assert!(result.summary.contains(" and "));
    }

    #[test]
    fn test_three_changes_uses_oxford_comma() {
        let op = SetOptionsOperation {
            home_domain: Some("example.com".to_string()),
            low_threshold: Some(1),
            med_threshold: Some(2),
            ..base_op()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.changes.len(), 3);
        assert!(result.summary.contains(", and "));
    }

    #[test]
    fn test_signer_add_plus_home_domain() {
        let op = SetOptionsOperation {
            home_domain: Some("example.com".to_string()),
            signer_key: Some("GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB".to_string()),
            signer_weight: Some(1),
            ..base_op()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.changes.len(), 2);
        assert!(result.summary.contains("set home domain to example.com"));
        assert!(result.summary.contains("added signer"));
    }

    // ── Edge cases ─────────────────────────────────────────────────────────

    #[test]
    fn test_empty_set_options() {
        let op = SetOptionsOperation {
            id: "op1".to_string(),
            source_account: Some("GAAAA".to_string()),
            ..Default::default()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.changes.len(), 0);
        assert!(result.summary.contains("no recognised changes"));
    }

    #[test]
    fn test_set_flags_auth_required() {
        let op = SetOptionsOperation {
            set_flags: Some(1),
            ..base_op()
        };
        let result = explain_set_options(&op);

        assert!(result.changes[0].contains("AUTH_REQUIRED"));
        assert!(result.changes[0].contains("enabled"));
    }

    #[test]
    fn test_clear_flags_auth_revocable() {
        let op = SetOptionsOperation {
            clear_flags: Some(2),
            ..base_op()
        };
        let result = explain_set_options(&op);

        assert!(result.changes[0].contains("AUTH_REVOCABLE"));
        assert!(result.changes[0].contains("disabled"));
    }

    #[test]
    fn test_unknown_account_fallback() {
        let op = SetOptionsOperation {
            source_account: None,
            home_domain: Some("test.com".to_string()),
            ..Default::default()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.account, "Unknown");
        assert!(result.summary.starts_with("Unknown"));
    }

    #[test]
    fn test_account_field_in_result() {
        let op = SetOptionsOperation {
            source_account: Some("GSPECIFIC".to_string()),
            home_domain: Some("test.com".to_string()),
            ..Default::default()
        };
        let result = explain_set_options(&op);

        assert_eq!(result.account, "GSPECIFIC");
        assert!(result.summary.starts_with("GSPECIFIC"));
    }
}