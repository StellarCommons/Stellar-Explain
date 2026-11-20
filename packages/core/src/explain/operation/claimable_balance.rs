//! Explainer for create_claimable_balance and claim_claimable_balance operations.
//!
//! Claimable balances allow escrow of Stellar assets with conditions on when
//! they can be claimed. The sender creates a balance with one or more claimants,
//! each with a predicate (condition). A claimant can later claim the balance
//! once their predicate is satisfied.
//!
//! Horizon fixtures verified against:
//! - create_claimable_balance:
//!   https://developers.stellar.org/docs/data/apis/horizon/api-reference/resources/operations/object/create-claimable-balance
//! - claim_claimable_balance:
//!   https://developers.stellar.org/docs/data/apis/horizon/api-reference/resources/operations/object/claim-claimable-balance

use super::format::shorten_id;
use crate::models::operation::{
    ClaimClaimableBalanceOperation, ClaimPredicate, CreateClaimableBalanceOperation,
    format_asset_string,
};
use serde::{Deserialize, Serialize};

/// Human-readable explanation of a create_claimable_balance operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CreateClaimableBalanceExplanation {
    /// Full natural-language summary.
    pub summary: String,
    /// The account that created the claimable balance.
    pub source_account: String,
    /// Display-formatted asset (e.g. "XLM (native)", "USDC (GISSUER...)").
    pub asset: String,
    /// The amount escrowed.
    pub amount: String,
    /// Number of claimants.
    pub claimant_count: usize,
    /// Rendered claimant conditions (one per claimant).
    pub claimant_descriptions: Vec<String>,
}

/// Human-readable explanation of a claim_claimable_balance operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ClaimClaimableBalanceExplanation {
    /// Full natural-language summary.
    pub summary: String,
    /// The account claiming the balance.
    pub claimant: String,
    /// The balance ID being claimed.
    pub balance_id: String,
}

/// Explain a create_claimable_balance operation.
///
/// Creates a claimable balance escrowing `amount` of `asset` with conditions
/// for each claimant.
pub fn explain_create_claimable_balance(
    op: &CreateClaimableBalanceOperation,
) -> CreateClaimableBalanceExplanation {
    let source = op
        .source_account
        .clone()
        .unwrap_or_else(|| "Unknown".to_string());

    let asset_display = format_asset_string(&op.asset);
    let claimant_count = op.claimants.len();

    let claimant_descriptions: Vec<String> = op
        .claimants
        .iter()
        .map(|c| {
            let condition = render_predicate(&c.predicate);
            format!("{}: {}", c.destination, condition)
        })
        .collect();

    let claimant_text = if claimant_count == 1 {
        "1 claimant".to_string()
    } else {
        format!("{claimant_count} claimants")
    };

    let summary = format!(
        "{} created a claimable balance of {} {} for {}",
        source, op.amount, asset_display, claimant_text
    );

    CreateClaimableBalanceExplanation {
        summary,
        source_account: source,
        asset: asset_display,
        amount: op.amount.clone(),
        claimant_count,
        claimant_descriptions,
    }
}

/// Explain a claim_claimable_balance operation.
///
/// A claimant claims a previously created claimable balance.
pub fn explain_claim_claimable_balance(
    op: &ClaimClaimableBalanceOperation,
) -> ClaimClaimableBalanceExplanation {
    let short_id = shorten_id(&op.balance_id);
    let summary = format!("{} claimed claimable balance {}", op.claimant, short_id);

    ClaimClaimableBalanceExplanation {
        summary,
        claimant: op.claimant.clone(),
        balance_id: op.balance_id.clone(),
    }
}

/// Render a `ClaimPredicate` into a plain-English clause.
pub fn render_predicate(predicate: &ClaimPredicate) -> String {
    match predicate {
        ClaimPredicate::Unconditional => "can claim immediately".to_string(),
        ClaimPredicate::AbsBefore(ts) => format!("claimable after {ts}"),
        ClaimPredicate::AbsBeforeEpoch(epoch) => format!("claimable after epoch {epoch}"),
        ClaimPredicate::RelBefore(secs) => {
            format!("claimable after {secs} seconds from creation")
        }
        ClaimPredicate::And(items) => {
            let parts: Vec<String> = items.iter().map(render_predicate).collect();
            format!("both conditions must be met: {}", parts.join(" and "))
        }
        ClaimPredicate::Or(items) => {
            let parts: Vec<String> = items.iter().map(render_predicate).collect();
            format!("either condition: {}", parts.join(" or "))
        }
        ClaimPredicate::Not(inner) => {
            format!("only if {}", negate_predicate(inner))
        }
        ClaimPredicate::Unrecognized(raw) => {
            format!("under an unrecognized condition (raw: {raw})")
        }
    }
}

/// Negate a predicate for rendering inside a NOT clause.
fn negate_predicate(predicate: &ClaimPredicate) -> String {
    match predicate {
        ClaimPredicate::Unconditional => "the opposite of unconditional (never)".to_string(),
        ClaimPredicate::AbsBefore(ts) => format!("after {ts} has NOT passed"),
        ClaimPredicate::AbsBeforeEpoch(epoch) => format!("after epoch {epoch} has NOT passed"),
        ClaimPredicate::RelBefore(secs) => {
            format!("{secs} seconds have NOT elapsed since creation")
        }
        ClaimPredicate::And(items) => {
            let parts: Vec<String> = items.iter().map(render_predicate).collect();
            format!("NOT (both conditions: {})", parts.join(" and "))
        }
        ClaimPredicate::Or(items) => {
            let parts: Vec<String> = items.iter().map(render_predicate).collect();
            format!("NOT (either condition: {})", parts.join(" or "))
        }
        ClaimPredicate::Not(inner) => render_predicate(inner),
        ClaimPredicate::Unrecognized(raw) => {
            format!("NOT (unrecognized condition: {raw})")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::operation::{ClaimPredicate, Claimant};
    use serde_json::json;

    fn make_unconditional_claimant(destination: &str) -> Claimant {
        Claimant {
            destination: destination.to_string(),
            predicate: ClaimPredicate::Unconditional,
        }
    }

    fn make_abs_before_claimant(destination: &str, ts: &str) -> Claimant {
        Claimant {
            destination: destination.to_string(),
            predicate: ClaimPredicate::AbsBefore(ts.to_string()),
        }
    }

    // ── create_claimable_balance ──────────────────────────────────────────

    #[test]
    fn test_create_claimable_balance_unconditional() {
        let op = CreateClaimableBalanceOperation {
            id: "op1".to_string(),
            source_account: Some("GSENDER".to_string()),
            asset: "native".to_string(),
            amount: "100.0000000".to_string(),
            claimants: vec![make_unconditional_claimant("GCLAIMANT")],
        };
        let explanation = explain_create_claimable_balance(&op);
        assert!(explanation.summary.contains("GSENDER"));
        assert!(explanation.summary.contains("100.0000000"));
        assert!(explanation.summary.contains("XLM (native)"));
        assert!(explanation.summary.contains("1 claimant"));
        assert_eq!(explanation.claimant_count, 1);
    }

    #[test]
    fn test_create_claimable_balance_credit_asset() {
        let op = CreateClaimableBalanceOperation {
            id: "op2".to_string(),
            source_account: Some("GSENDER".to_string()),
            asset: "USDC:GISSUER123".to_string(),
            amount: "50.0000000".to_string(),
            claimants: vec![make_unconditional_claimant("GCLAIMANT")],
        };
        let explanation = explain_create_claimable_balance(&op);
        assert!(explanation.asset.contains("USDC"));
        assert!(explanation.asset.contains("GISSUER123"));
    }

    #[test]
    fn test_create_claimable_balance_multiple_claimants() {
        let op = CreateClaimableBalanceOperation {
            id: "op3".to_string(),
            source_account: Some("GSENDER".to_string()),
            asset: "native".to_string(),
            amount: "200.0000000".to_string(),
            claimants: vec![
                make_unconditional_claimant("GCLAIMANT1"),
                make_abs_before_claimant("GCLAIMANT2", "2025-12-31T23:59:59Z"),
            ],
        };
        let explanation = explain_create_claimable_balance(&op);
        assert!(explanation.summary.contains("2 claimants"));
        assert_eq!(explanation.claimant_count, 2);
        assert_eq!(explanation.claimant_descriptions.len(), 2);
    }

    #[test]
    fn test_create_claimable_balance_abs_before_predicate() {
        let op = CreateClaimableBalanceOperation {
            id: "op4".to_string(),
            source_account: Some("GSENDER".to_string()),
            asset: "native".to_string(),
            amount: "10.0000000".to_string(),
            claimants: vec![make_abs_before_claimant(
                "GCLAIMANT",
                "2025-01-01T00:00:00Z",
            )],
        };
        let explanation = explain_create_claimable_balance(&op);
        assert!(explanation.claimant_descriptions[0].contains("2025-01-01T00:00:00Z"));
    }

    #[test]
    fn test_create_claimable_balance_rel_before_predicate() {
        let op = CreateClaimableBalanceOperation {
            id: "op5".to_string(),
            source_account: Some("GSENDER".to_string()),
            asset: "native".to_string(),
            amount: "10.0000000".to_string(),
            claimants: vec![Claimant {
                destination: "GCLAIMANT".to_string(),
                predicate: ClaimPredicate::RelBefore("86400".to_string()),
            }],
        };
        let explanation = explain_create_claimable_balance(&op);
        assert!(explanation.claimant_descriptions[0].contains("86400"));
        assert!(explanation.claimant_descriptions[0].contains("seconds"));
    }

    #[test]
    fn test_create_claimable_balance_and_predicate() {
        let op = CreateClaimableBalanceOperation {
            id: "op6".to_string(),
            source_account: Some("GSENDER".to_string()),
            asset: "native".to_string(),
            amount: "10.0000000".to_string(),
            claimants: vec![Claimant {
                destination: "GCLAIMANT".to_string(),
                predicate: ClaimPredicate::And(vec![
                    ClaimPredicate::RelBefore("12".to_string()),
                    ClaimPredicate::Not(Box::new(ClaimPredicate::Unconditional)),
                ]),
            }],
        };
        let explanation = explain_create_claimable_balance(&op);
        assert!(explanation.claimant_descriptions[0].contains("both conditions"));
    }

    #[test]
    fn test_create_claimable_balance_or_predicate() {
        let op = CreateClaimableBalanceOperation {
            id: "op7".to_string(),
            source_account: Some("GSENDER".to_string()),
            asset: "native".to_string(),
            amount: "10.0000000".to_string(),
            claimants: vec![Claimant {
                destination: "GCLAIMANT".to_string(),
                predicate: ClaimPredicate::Or(vec![
                    ClaimPredicate::RelBefore("12".to_string()),
                    ClaimPredicate::AbsBefore("2025-08-26T11:15:39Z".to_string()),
                ]),
            }],
        };
        let explanation = explain_create_claimable_balance(&op);
        assert!(explanation.claimant_descriptions[0].contains("either condition"));
    }

    #[test]
    fn test_create_claimable_balance_not_predicate() {
        let op = CreateClaimableBalanceOperation {
            id: "op8".to_string(),
            source_account: Some("GSENDER".to_string()),
            asset: "native".to_string(),
            amount: "10.0000000".to_string(),
            claimants: vec![Claimant {
                destination: "GCLAIMANT".to_string(),
                predicate: ClaimPredicate::Not(Box::new(ClaimPredicate::Unconditional)),
            }],
        };
        let explanation = explain_create_claimable_balance(&op);
        assert!(explanation.claimant_descriptions[0].contains("only if"));
    }

    #[test]
    fn test_create_claimable_balance_unknown_source() {
        let op = CreateClaimableBalanceOperation {
            id: "op9".to_string(),
            source_account: None,
            asset: "native".to_string(),
            amount: "5.0000000".to_string(),
            claimants: vec![make_unconditional_claimant("GCLAIMANT")],
        };
        let explanation = explain_create_claimable_balance(&op);
        assert!(explanation.summary.contains("Unknown"));
    }

    #[test]
    fn test_create_claimable_balance_unrecognized_predicate() {
        let op = CreateClaimableBalanceOperation {
            id: "op_unrec".to_string(),
            source_account: Some("GSENDER".to_string()),
            asset: "native".to_string(),
            amount: "1.0000000".to_string(),
            claimants: vec![Claimant {
                destination: "GCLAIMANT".to_string(),
                predicate: ClaimPredicate::Unrecognized("{}".to_string()),
            }],
        };
        let explanation = explain_create_claimable_balance(&op);
        assert!(explanation.claimant_descriptions[0].contains("unrecognized condition"));
    }

    // ── claim_claimable_balance ───────────────────────────────────────────

    #[test]
    fn test_claim_claimable_balance_summary() {
        let op = ClaimClaimableBalanceOperation {
            id: "op10".to_string(),
            source_account: Some("GCLAIMANT".to_string()),
            balance_id: "00000000abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
                .to_string(),
            claimant: "GCLAIMANT".to_string(),
        };
        let explanation = explain_claim_claimable_balance(&op);
        assert!(explanation.summary.contains("GCLAIMANT"));
        assert!(explanation.summary.contains("claimed claimable balance"));
    }

    #[test]
    fn test_claim_claimable_balance_id_shortened() {
        let op = ClaimClaimableBalanceOperation {
            id: "op11".to_string(),
            source_account: Some("GCLAIMANT".to_string()),
            balance_id: "00000000abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
                .to_string(),
            claimant: "GCLAIMANT".to_string(),
        };
        let explanation = explain_claim_claimable_balance(&op);
        assert!(explanation.summary.contains("00000000"));
        assert!(explanation.summary.contains("ef12"));
    }

    #[test]
    fn test_claim_claimable_balance_full_id_preserved() {
        let op = ClaimClaimableBalanceOperation {
            id: "op12".to_string(),
            source_account: Some("GCLAIMANT".to_string()),
            balance_id: "00000000abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
                .to_string(),
            claimant: "GCLAIMANT".to_string(),
        };
        let explanation = explain_claim_claimable_balance(&op);
        assert_eq!(
            explanation.balance_id,
            "00000000abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
        );
    }

    #[test]
    fn test_claim_claimable_balance_short_id_not_truncated() {
        let op = ClaimClaimableBalanceOperation {
            id: "op13".to_string(),
            source_account: Some("GCLAIMANT".to_string()),
            balance_id: "shortid".to_string(),
            claimant: "GCLAIMANT".to_string(),
        };
        let explanation = explain_claim_claimable_balance(&op);
        assert!(explanation.summary.contains("shortid"));
    }

    // ── predicate rendering ───────────────────────────────────────────────

    #[test]
    fn test_render_unconditional() {
        let p = ClaimPredicate::Unconditional;
        assert_eq!(render_predicate(&p), "can claim immediately");
    }

    #[test]
    fn test_render_abs_before() {
        let p = ClaimPredicate::AbsBefore("2025-01-01T00:00:00Z".to_string());
        assert_eq!(render_predicate(&p), "claimable after 2025-01-01T00:00:00Z");
    }

    #[test]
    fn test_render_rel_before() {
        let p = ClaimPredicate::RelBefore("86400".to_string());
        assert_eq!(
            render_predicate(&p),
            "claimable after 86400 seconds from creation"
        );
    }

    #[test]
    fn test_render_and() {
        let p = ClaimPredicate::And(vec![
            ClaimPredicate::RelBefore("12".to_string()),
            ClaimPredicate::Unconditional,
        ]);
        let result = render_predicate(&p);
        assert!(result.contains("both conditions"));
        assert!(result.contains("and"));
    }

    #[test]
    fn test_render_or() {
        let p = ClaimPredicate::Or(vec![
            ClaimPredicate::RelBefore("12".to_string()),
            ClaimPredicate::AbsBefore("2025-08-26T11:15:39Z".to_string()),
        ]);
        let result = render_predicate(&p);
        assert!(result.contains("either condition"));
        assert!(result.contains("or"));
    }

    #[test]
    fn test_render_not() {
        let p = ClaimPredicate::Not(Box::new(ClaimPredicate::Unconditional));
        assert_eq!(
            render_predicate(&p),
            "only if the opposite of unconditional (never)"
        );
    }

    #[test]
    fn test_render_nested_predicates() {
        // Matches the real Horizon fixture from the docs:
        // and([or([relBefore("12"), absBefore(...)]), not(unconditional)])
        let p = ClaimPredicate::And(vec![
            ClaimPredicate::Or(vec![
                ClaimPredicate::RelBefore("12".to_string()),
                ClaimPredicate::AbsBefore("2020-08-26T11:15:39Z".to_string()),
            ]),
            ClaimPredicate::Not(Box::new(ClaimPredicate::Unconditional)),
        ]);
        let result = render_predicate(&p);
        assert!(result.contains("both conditions"));
        assert!(result.contains("either condition"));
        assert!(result.contains("only if"));
    }

    #[test]
    fn test_render_unrecognized() {
        let p = ClaimPredicate::Unrecognized(r#"{"future_key": true}"#.to_string());
        let result = render_predicate(&p);
        assert!(result.contains("unrecognized condition"));
        assert!(result.contains("future_key"));
    }

    // ── from_horizon_predicate (JSON boundary) ────────────────────────────
    // Tests that feed real Horizon-shaped JSON through the parser instead
    // of constructing ClaimPredicate variants directly in Rust.

    #[test]
    fn test_from_horizon_predicate_unconditional() {
        let pred = ClaimPredicate::from_horizon_predicate(json!({"unconditional": true}));
        assert_eq!(pred, ClaimPredicate::Unconditional);
    }

    #[test]
    fn test_from_horizon_predicate_abs_before() {
        let pred = ClaimPredicate::from_horizon_predicate(
            json!({"absBefore": "2025-01-01T00:00:00Z", "absBeforeEpoch": "1735689600"}),
        );
        assert_eq!(
            pred,
            ClaimPredicate::AbsBefore("2025-01-01T00:00:00Z".to_string())
        );
    }

    #[test]
    fn test_from_horizon_predicate_abs_before_epoch_only() {
        let pred = ClaimPredicate::from_horizon_predicate(json!({"absBeforeEpoch": "1735689600"}));
        assert_eq!(
            pred,
            ClaimPredicate::AbsBeforeEpoch("1735689600".to_string())
        );
    }

    #[test]
    fn test_from_horizon_predicate_rel_before() {
        let pred = ClaimPredicate::from_horizon_predicate(json!({"relBefore": "86400"}));
        assert_eq!(pred, ClaimPredicate::RelBefore("86400".to_string()));
    }

    #[test]
    fn test_from_horizon_predicate_and() {
        let pred = ClaimPredicate::from_horizon_predicate(json!({
            "and": [
                {"relBefore": "12"},
                {"unconditional": true}
            ]
        }));
        match pred {
            ClaimPredicate::And(items) => {
                assert_eq!(items.len(), 2);
                assert_eq!(items[0], ClaimPredicate::RelBefore("12".to_string()));
                assert_eq!(items[1], ClaimPredicate::Unconditional);
            }
            _ => panic!("Expected And variant"),
        }
    }

    #[test]
    fn test_from_horizon_predicate_or() {
        let pred = ClaimPredicate::from_horizon_predicate(json!({
            "or": [
                {"relBefore": "12"},
                {"absBefore": "2025-08-26T11:15:39Z"}
            ]
        }));
        match pred {
            ClaimPredicate::Or(items) => {
                assert_eq!(items.len(), 2);
                assert_eq!(items[0], ClaimPredicate::RelBefore("12".to_string()));
                assert_eq!(
                    items[1],
                    ClaimPredicate::AbsBefore("2025-08-26T11:15:39Z".to_string())
                );
            }
            _ => panic!("Expected Or variant"),
        }
    }

    #[test]
    fn test_from_horizon_predicate_not() {
        let pred = ClaimPredicate::from_horizon_predicate(json!({"not": {"unconditional": true}}));
        assert_eq!(
            pred,
            ClaimPredicate::Not(Box::new(ClaimPredicate::Unconditional))
        );
    }

    #[test]
    fn test_from_horizon_predicate_nested_fixture() {
        // Real Horizon fixture from the official docs:
        // and([or([relBefore("12"), absBefore(...)]), not(unconditional)])
        let pred = ClaimPredicate::from_horizon_predicate(json!({
            "and": [
                {
                    "or": [
                        {"relBefore": "12"},
                        {"absBefore": "2020-08-26T11:15:39Z", "absBeforeEpoch": "1598440539"}
                    ]
                },
                {"not": {"unconditional": true}}
            ]
        }));
        match pred {
            ClaimPredicate::And(items) => {
                assert_eq!(items.len(), 2);
                assert!(matches!(&items[0], ClaimPredicate::Or(_)));
                assert!(matches!(&items[1], ClaimPredicate::Not(_)));
            }
            _ => panic!("Expected And variant"),
        }
    }

    #[test]
    fn test_from_horizon_predicate_empty_object_returns_unrecognized() {
        let pred = ClaimPredicate::from_horizon_predicate(json!({}));
        assert!(matches!(pred, ClaimPredicate::Unrecognized(_)));
    }

    #[test]
    fn test_from_horizon_predicate_unknown_keys_returns_unrecognized() {
        let pred =
            ClaimPredicate::from_horizon_predicate(json!({"futureVariant": "foo", "value": 42}));
        assert!(matches!(pred, ClaimPredicate::Unrecognized(_)));
    }

    #[test]
    fn test_from_horizon_predicate_null_returns_unrecognized() {
        let pred = ClaimPredicate::from_horizon_predicate(json!(null));
        assert!(matches!(pred, ClaimPredicate::Unrecognized(_)));
    }

    #[test]
    fn test_from_horizon_predicate_string_returns_unrecognized() {
        let pred = ClaimPredicate::from_horizon_predicate(json!("not a predicate"));
        assert!(matches!(pred, ClaimPredicate::Unrecognized(_)));
    }

    #[test]
    fn test_from_horizon_predicate_array_returns_unrecognized() {
        let pred = ClaimPredicate::from_horizon_predicate(json!([1, 2, 3]));
        assert!(matches!(pred, ClaimPredicate::Unrecognized(_)));
    }

    #[test]
    fn test_from_horizon_predicate_real_horizon_fixture() {
        // Exact JSON from the Horizon docs create_claimable_balance example
        let pred = ClaimPredicate::from_horizon_predicate(json!({
            "and": [
                {
                    "or": [
                        {"relBefore": "12"},
                        {"absBefore": "2020-08-26T11:15:39Z", "absBeforeEpoch": "1598440539"}
                    ]
                },
                {"not": {"unconditional": true}}
            ]
        }));
        // Should produce a valid renderable predicate, not Unrecognized
        let rendered = render_predicate(&pred);
        assert!(rendered.contains("both conditions"));
        assert!(rendered.contains("either condition"));
        assert!(rendered.contains("only if"));
    }
}
