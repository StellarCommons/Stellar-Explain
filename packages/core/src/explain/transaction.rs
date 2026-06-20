use serde::{Deserialize, Serialize};

use crate::explain::memo::explain_memo;
use crate::models::fee::FeeStats;
use crate::models::operation::{OfferType, Operation, PathPaymentType};
use crate::models::transaction::Transaction;

use super::operation::account_merge::explain_account_merge;
use super::operation::change_trust::explain_change_trust;
use super::operation::clawback::{explain_clawback, explain_clawback_claimable_balance};
use super::operation::create_account::explain_create_account;
use super::operation::manage_offer::explain_manage_offer;
use super::operation::path_payment::explain_path_payment;
use super::operation::payment::{PaymentExplanation, explain_payment, explain_payment_with_fee};
use super::operation::set_options::explain_set_options;

/// A single explained operation within a transaction, in original order.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OperationExplanation {
    /// Position of this operation within the transaction (0-based).
    pub index: usize,
    /// The Stellar operation type, e.g. "payment", "create_account".
    #[serde(rename = "type")]
    pub operation_type: String,
    /// Plain-English summary of what this operation did.
    pub summary: String,
    /// Structured, type-specific details for this operation.
    pub details: serde_json::Value,
}

/// Complete explanation of a transaction.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TransactionExplanation {
    pub transaction_hash: String,
    pub successful: bool,
    pub summary: String,
    /// One explanation per operation, in the original order of the transaction.
    pub operations: Vec<OperationExplanation>,
    /// Deprecated: kept for backward compatibility with existing consumers.
    /// Use `operations` instead.
    pub payment_explanations: Vec<PaymentExplanation>,
    /// Count of operations whose type is genuinely unsupported (i.e. mapped to "Other").
    pub skipped_operations: usize,
    /// Human-readable explanation of the transaction memo.
    pub memo_explanation: Option<String>,
    /// Human-readable explanation of transaction fee context.
    pub fee_explanation: Option<String>,
    /// ISO 8601 timestamp of when the ledger closed (from Horizon).
    pub ledger_closed_at: Option<String>,
    /// Ledger sequence number this transaction was included in.
    pub ledger: Option<u64>,
}

pub type ExplainResult = Result<TransactionExplanation, ExplainError>;

#[derive(Debug, Clone, PartialEq)]
pub enum ExplainError {
    EmptyTransaction,
}

impl std::fmt::Display for ExplainError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExplainError::EmptyTransaction => {
                write!(f, "This transaction contains no operations")
            }
        }
    }
}

impl std::error::Error for ExplainError {}

/// Format an ISO 8601 timestamp from Horizon into a human-readable string.
///
/// Input:  "2024-01-15T14:32:00Z"
/// Output: "2024-01-15 at 14:32 UTC"
///
/// Returns the original string unchanged if it cannot be parsed.
pub fn format_ledger_time(iso_string: &str) -> String {
    // Expected format: YYYY-MM-DDTHH:MM:SSZ or YYYY-MM-DDTHH:MM:SS+00:00
    // We split on 'T' to separate date and time parts.
    let s = iso_string.trim();

    let t_pos = match s.find('T') {
        Some(pos) => pos,
        None => return iso_string.to_string(),
    };

    let date = &s[..t_pos];
    let time_part = &s[t_pos + 1..];

    // Strip timezone suffix: trailing Z, +00:00, or similar
    let time = if let Some(z_pos) = time_part.find('Z') {
        &time_part[..z_pos]
    } else if let Some(plus_pos) = time_part.find('+') {
        &time_part[..plus_pos]
    } else if let Some(minus_pos) = time_part[1..].find('-').map(|p| p + 1) {
        // Only strip trailing timezone offset (not the date hyphens)
        // time_part looks like "14:32:00-05:00"
        &time_part[..minus_pos]
    } else {
        time_part
    };

    // Take only HH:MM (drop seconds)
    let hhmm = if time.len() >= 5 { &time[..5] } else { time };

    format!("{date} at {hhmm} UTC")
}

/// Produce a plain-English fee explanation.
pub fn explain_fee(fee_charged: u64, fee_stats: Option<&FeeStats>) -> String {
    let xlm = FeeStats::stroops_to_xlm(fee_charged);
    match fee_stats {
        None => format!("A fee of {xlm} XLM was charged."),
        Some(stats) => {
            if stats.is_high_fee(fee_charged) {
                let multiplier = fee_charged / stats.base_fee.max(1);
                format!(
                    "A fee of {xlm} XLM was charged. This is above average — {multiplier}x the base fee."
                )
            } else {
                format!("A fee of {xlm} XLM was charged. This is a standard network fee.")
            }
        }
    }
}

pub fn explain_transaction(
    transaction: &Transaction,
    fee_stats: Option<&FeeStats>,
) -> ExplainResult {
    explain_transaction_with_ledger(transaction, fee_stats, None, None)
}

/// Full explanation with optional ledger time enrichment.
pub fn explain_transaction_with_ledger(
    transaction: &Transaction,
    fee_stats: Option<&FeeStats>,
    created_at: Option<&str>,
    ledger: Option<u64>,
) -> ExplainResult {
    let total_operations = transaction.operations.len();

    if total_operations == 0 {
        return Err(ExplainError::EmptyTransaction);
    }

    let payment_count = transaction.payment_count();

    let payment_explanations = transaction
        .payment_operations()
        .into_iter()
        .map(|payment| match fee_stats {
            Some(stats) => explain_payment_with_fee(payment, transaction.fee_charged, stats),
            None => explain_payment(payment),
        })
        .collect::<Vec<_>>();

    let operations: Vec<OperationExplanation> = transaction
        .operations
        .iter()
        .enumerate()
        .map(|(index, op)| explain_operation(index, op, transaction.fee_charged, fee_stats))
        .collect();

    let skipped_operations = operations
        .iter()
        .filter(|op| is_unsupported_type(&op.operation_type))
        .count();

    let base_summary =
        build_transaction_summary(transaction.successful, payment_count, skipped_operations);

    // Enrich summary with ledger time if available
    let summary = match (created_at, ledger) {
        (Some(ts), Some(seq)) => {
            let formatted_time = format_ledger_time(ts);
            format!(
                "{base_summary} This transaction was confirmed on {formatted_time} (ledger #{seq})."
            )
        }
        (Some(ts), None) => {
            let formatted_time = format_ledger_time(ts);
            format!("{base_summary} This transaction was confirmed on {formatted_time}.")
        }
        (None, Some(seq)) => {
            format!("{base_summary} Included in ledger #{seq}.")
        }
        (None, None) => base_summary,
    };

    let memo_explanation = transaction.memo.as_ref().and_then(explain_memo);
    let fee_explanation = Some(explain_fee(transaction.fee_charged, fee_stats));

    Ok(TransactionExplanation {
        transaction_hash: transaction.hash.clone(),
        successful: transaction.successful,
        summary,
        operations,
        payment_explanations,
        skipped_operations,
        memo_explanation,
        fee_explanation,
        ledger_closed_at: created_at.map(|s| s.to_string()),
        ledger,
    })
}

/// True for operation type strings that have no dedicated explainer and
/// fall back to the generic "coming soon" message.
fn is_unsupported_type(operation_type: &str) -> bool {
    !matches!(
        operation_type,
        "payment"
            | "create_account"
            | "change_trust"
            | "set_options"
            | "account_merge"
            | "manage_sell_offer"
            | "manage_buy_offer"
            | "path_payment_strict_send"
            | "path_payment_strict_receive"
            | "clawback"
            | "clawback_claimable_balance"
    )
}

/// Build the structured explanation for a single operation, preserving its
/// position within the transaction.
fn explain_operation(
    index: usize,
    op: &Operation,
    fee_charged: u64,
    fee_stats: Option<&FeeStats>,
) -> OperationExplanation {
    match op {
        Operation::Payment(payment) => {
            let explanation = match fee_stats {
                Some(stats) => explain_payment_with_fee(payment, fee_charged, stats),
                None => explain_payment(payment),
            };
            OperationExplanation {
                index,
                operation_type: "payment".to_string(),
                summary: explanation.summary.clone(),
                details: serde_json::json!({
                    "from": explanation.from,
                    "to": explanation.to,
                    "amount": explanation.amount,
                    "asset": explanation.asset,
                }),
            }
        }
        Operation::CreateAccount(create_account) => {
            let explanation = explain_create_account(create_account);
            OperationExplanation {
                index,
                operation_type: "create_account".to_string(),
                summary: explanation.summary.clone(),
                details: serde_json::json!({
                    "funder": explanation.funder,
                    "account": explanation.new_account,
                    "starting_balance": explanation.starting_balance,
                }),
            }
        }
        Operation::ChangeTrust(change_trust) => {
            let explanation = explain_change_trust(change_trust);
            OperationExplanation {
                index,
                operation_type: "change_trust".to_string(),
                summary: explanation.summary.clone(),
                details: serde_json::json!({
                    "account": explanation.trustor,
                    "asset": explanation.asset_code,
                    "issuer": explanation.asset_issuer,
                    "limit": explanation.limit,
                    "is_removal": explanation.is_removal,
                }),
            }
        }
        Operation::SetOptions(set_options) => {
            let explanation = explain_set_options(set_options);
            OperationExplanation {
                index,
                operation_type: "set_options".to_string(),
                summary: explanation.summary.clone(),
                details: serde_json::json!({
                    "account": explanation.account,
                    "changes": explanation.changes,
                }),
            }
        }
        Operation::AccountMerge(account_merge) => {
            let explanation = explain_account_merge(account_merge);
            OperationExplanation {
                index,
                operation_type: "account_merge".to_string(),
                summary: explanation.summary.clone(),
                details: serde_json::json!({
                    "source": explanation.source,
                    "destination": explanation.destination,
                }),
            }
        }
        Operation::ManageOffer(manage_offer) => {
            let explanation = explain_manage_offer(manage_offer);
            let operation_type = match manage_offer.offer_type {
                OfferType::Sell => "manage_sell_offer",
                OfferType::Buy => "manage_buy_offer",
            };
            OperationExplanation {
                index,
                operation_type: operation_type.to_string(),
                summary: explanation.summary.clone(),
                details: serde_json::json!({
                    "account": explanation.seller,
                    "selling_asset": explanation.selling_asset,
                    "buying_asset": explanation.buying_asset,
                    "amount": explanation.amount,
                    "price": explanation.price,
                    "offer_id": explanation.offer_id,
                    "action": explanation.action,
                }),
            }
        }
        Operation::PathPayment(path_payment) => {
            let explanation = explain_path_payment(path_payment);
            let operation_type = match path_payment.payment_type {
                PathPaymentType::StrictSend => "path_payment_strict_send",
                PathPaymentType::StrictReceive => "path_payment_strict_receive",
            };
            OperationExplanation {
                index,
                operation_type: operation_type.to_string(),
                summary: explanation.summary.clone(),
                details: serde_json::json!({
                    "from": explanation.sender,
                    "to": explanation.destination,
                    "send_asset": explanation.send_asset,
                    "send_amount": explanation.send_amount,
                    "dest_asset": explanation.dest_asset,
                    "dest_amount": explanation.dest_amount,
                    "path_description": explanation.path_description,
                }),
            }
        }
        Operation::Clawback(clawback) => {
            let explanation = explain_clawback(clawback);
            OperationExplanation {
                index,
                operation_type: "clawback".to_string(),
                summary: explanation.summary.clone(),
                details: serde_json::json!({
                    "issuer": explanation.issuer,
                    "from": explanation.from,
                    "asset": explanation.asset_code,
                    "asset_issuer": explanation.asset_issuer,
                    "amount": explanation.amount,
                }),
            }
        }
        Operation::ClawbackClaimableBalance(clawback_balance) => {
            let explanation = explain_clawback_claimable_balance(clawback_balance);
            OperationExplanation {
                index,
                operation_type: "clawback_claimable_balance".to_string(),
                summary: explanation.summary.clone(),
                details: serde_json::json!({
                    "issuer": explanation.issuer,
                    "balance_id": explanation.balance_id,
                }),
            }
        }
        Operation::Other(other) => OperationExplanation {
            index,
            operation_type: other.operation_type.clone(),
            summary: format!(
                "{} operation — full support coming soon",
                other.operation_type
            ),
            details: serde_json::json!({}),
        },
    }
}

fn build_transaction_summary(successful: bool, payment_count: usize, skipped: usize) -> String {
    let status = if successful { "successful" } else { "failed" };

    if payment_count == 0 {
        let op_word = if skipped == 1 {
            "operation"
        } else {
            "operations"
        };
        return format!(
            "This {status} transaction contains {skipped} {op_word} that Stellar Explain does not yet support."
        );
    }

    let payment_text = if payment_count == 1 {
        "1 payment".to_string()
    } else {
        format!("{payment_count} payments")
    };

    let mut parts = vec![format!(
        "This {} transaction contains {}",
        status, payment_text
    )];

    if skipped > 0 {
        let skipped_text = if skipped == 1 {
            "1 other operation was skipped".to_string()
        } else {
            format!("{skipped} other operations were skipped")
        };
        parts.push(skipped_text);
    }

    parts.join(". ") + "."
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::memo::Memo;
    use crate::models::operation::{Operation, OtherOperation, PaymentOperation};

    fn create_payment_operation(id: &str, amount: &str) -> Operation {
        Operation::Payment(PaymentOperation {
            id: id.to_string(),
            source_account: Some("GSENDER".to_string()),
            destination: "GDESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX".to_string(),
            asset_type: "native".to_string(),
            asset_code: None,
            asset_issuer: None,
            amount: amount.to_string(),
        })
    }

    fn create_other_operation(id: &str) -> Operation {
        Operation::Other(OtherOperation {
            id: id.to_string(),
            operation_type: "create_account".to_string(),
        })
    }

    fn base_tx() -> Transaction {
        Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_payment_operation("1", "50.0")],
            memo: None,
        }
    }

    // ── format_ledger_time ─────────────────────────────────────────────────

    #[test]
    fn test_format_ledger_time_standard_utc() {
        let result = format_ledger_time("2024-01-15T14:32:00Z");
        assert_eq!(result, "2024-01-15 at 14:32 UTC");
    }

    #[test]
    fn test_format_ledger_time_midnight() {
        let result = format_ledger_time("2024-06-01T00:00:00Z");
        assert_eq!(result, "2024-06-01 at 00:00 UTC");
    }

    #[test]
    fn test_format_ledger_time_end_of_day() {
        let result = format_ledger_time("2024-12-31T23:59:59Z");
        assert_eq!(result, "2024-12-31 at 23:59 UTC");
    }

    #[test]
    fn test_format_ledger_time_with_positive_offset() {
        // Some Horizon responses use +00:00 instead of Z
        let result = format_ledger_time("2024-03-10T08:15:00+00:00");
        assert_eq!(result, "2024-03-10 at 08:15 UTC");
    }

    #[test]
    fn test_format_ledger_time_strips_seconds() {
        // Only HH:MM should appear in output
        let result = format_ledger_time("2024-01-15T14:32:45Z");
        assert!(!result.contains(":45"));
        assert!(result.contains("14:32"));
    }

    #[test]
    fn test_format_ledger_time_invalid_returns_original() {
        let bad = "not-a-timestamp";
        let result = format_ledger_time(bad);
        assert_eq!(result, bad);
    }

    #[test]
    fn test_format_ledger_time_empty_string() {
        let result = format_ledger_time("");
        assert_eq!(result, "");
    }

    #[test]
    fn test_format_ledger_time_date_only() {
        // No T separator — should return original
        let result = format_ledger_time("2024-01-15");
        assert_eq!(result, "2024-01-15");
    }

    #[test]
    fn test_format_ledger_time_with_whitespace() {
        let result = format_ledger_time("  2024-01-15T14:32:00Z  ");
        assert_eq!(result, "2024-01-15 at 14:32 UTC");
    }

    // ── ledger enrichment ──────────────────────────────────────────────────

    #[test]
    fn test_explain_transaction_with_both_ledger_fields() {
        let result = explain_transaction_with_ledger(
            &base_tx(),
            None,
            Some("2024-01-15T14:32:00Z"),
            Some(49823145),
        )
        .unwrap();

        assert!(result.summary.contains("2024-01-15 at 14:32 UTC"));
        assert!(result.summary.contains("ledger #49823145"));
        assert_eq!(
            result.ledger_closed_at.as_deref(),
            Some("2024-01-15T14:32:00Z")
        );
        assert_eq!(result.ledger, Some(49823145));
    }

    #[test]
    fn test_explain_transaction_with_time_only() {
        let result =
            explain_transaction_with_ledger(&base_tx(), None, Some("2024-06-20T09:00:00Z"), None)
                .unwrap();

        assert!(result.summary.contains("2024-06-20 at 09:00 UTC"));
        assert!(!result.summary.contains("ledger #"));
        assert_eq!(result.ledger, None);
    }

    #[test]
    fn test_explain_transaction_with_ledger_only() {
        let result =
            explain_transaction_with_ledger(&base_tx(), None, None, Some(12345678)).unwrap();

        assert!(result.summary.contains("ledger #12345678"));
        assert_eq!(result.ledger_closed_at, None);
    }

    #[test]
    fn test_explain_transaction_without_ledger_fields() {
        let result = explain_transaction(&base_tx(), None).unwrap();
        assert_eq!(result.ledger_closed_at, None);
        assert_eq!(result.ledger, None);
        assert!(!result.summary.contains("confirmed on"));
        assert!(!result.summary.contains("ledger #"));
    }

    #[test]
    fn test_explain_fee_standard() {
        let stats = FeeStats::new(100, 100, 5000, 100, 250);
        let result = explain_fee(100, Some(&stats));
        assert!(result.contains("standard network fee"));
        assert!(result.contains("0.0000100"));
    }

    #[test]
    fn test_explain_fee_high() {
        let stats = FeeStats::new(100, 100, 5000, 100, 250);
        let result = explain_fee(1000, Some(&stats));
        assert!(result.contains("above average"));
        assert!(result.contains("10x"));
    }

    #[test]
    fn test_explain_transaction_with_memo() {
        let tx = Transaction {
            memo: Some(Memo::text("Invoice #12345").unwrap()),
            ..base_tx()
        };
        let explanation = explain_transaction(&tx, None).unwrap();
        assert!(explanation.memo_explanation.is_some());
        assert!(
            explanation
                .memo_explanation
                .unwrap()
                .contains("Invoice #12345")
        );
    }

    #[test]
    fn test_explain_no_payments_returns_ok() {
        let tx = Transaction {
            operations: vec![create_other_operation("1"), create_other_operation("2")],
            ..base_tx()
        };
        let result = explain_transaction(&tx, None).unwrap();
        assert_eq!(result.payment_explanations.len(), 0);
        assert_eq!(result.skipped_operations, 2);
    }

    #[test]
    fn test_explain_empty_transaction_returns_err() {
        let tx = Transaction {
            operations: vec![],
            ..base_tx()
        };
        assert!(explain_transaction(&tx, None).is_err());
    }

    #[test]
    fn test_build_transaction_summary_failed() {
        let summary = build_transaction_summary(false, 1, 0);
        assert_eq!(summary, "This failed transaction contains 1 payment.");
    }

    // ── operations[] array ─────────────────────────────────────────────────

    fn create_account_op(id: &str) -> Operation {
        Operation::CreateAccount(crate::models::operation::CreateAccountOperation {
            id: id.to_string(),
            funder: "GFUNDER".to_string(),
            new_account: "GNEWACCT".to_string(),
            starting_balance: "1.5".to_string(),
        })
    }

    fn change_trust_op(id: &str) -> Operation {
        Operation::ChangeTrust(crate::models::operation::ChangeTrustOperation {
            id: id.to_string(),
            trustor: "GTRUSTOR".to_string(),
            asset_code: "USDC".to_string(),
            asset_issuer: "GISSUER".to_string(),
            limit: "10000".to_string(),
        })
    }

    fn truly_unsupported_op(id: &str) -> Operation {
        Operation::Other(OtherOperation {
            id: id.to_string(),
            operation_type: "bump_sequence".to_string(),
        })
    }

    #[test]
    fn test_operations_array_present_with_correct_index_and_type() {
        let tx = Transaction {
            operations: vec![
                create_account_op("1"),
                create_payment_operation("2", "100"),
                change_trust_op("3"),
            ],
            ..base_tx()
        };
        let result = explain_transaction(&tx, None).unwrap();

        assert_eq!(result.operations.len(), 3);
        assert_eq!(result.operations[0].index, 0);
        assert_eq!(result.operations[0].operation_type, "create_account");
        assert_eq!(result.operations[1].index, 1);
        assert_eq!(result.operations[1].operation_type, "payment");
        assert_eq!(result.operations[2].index, 2);
        assert_eq!(result.operations[2].operation_type, "change_trust");
    }

    #[test]
    fn test_operations_preserve_original_order() {
        let tx = Transaction {
            operations: vec![
                change_trust_op("1"),
                create_account_op("2"),
                create_payment_operation("3", "50"),
            ],
            ..base_tx()
        };
        let result = explain_transaction(&tx, None).unwrap();

        let types: Vec<&str> = result
            .operations
            .iter()
            .map(|op| op.operation_type.as_str())
            .collect();
        assert_eq!(types, vec!["change_trust", "create_account", "payment"]);
    }

    #[test]
    fn test_fully_supported_transaction_has_zero_skipped() {
        let tx = Transaction {
            operations: vec![
                create_account_op("1"),
                create_payment_operation("2", "100"),
                change_trust_op("3"),
            ],
            ..base_tx()
        };
        let result = explain_transaction(&tx, None).unwrap();
        assert_eq!(result.skipped_operations, 0);
    }

    #[test]
    fn test_unknown_operation_type_graceful_fallback() {
        let tx = Transaction {
            operations: vec![truly_unsupported_op("1")],
            ..base_tx()
        };
        let result = explain_transaction(&tx, None).unwrap();

        assert_eq!(result.operations.len(), 1);
        assert_eq!(result.operations[0].operation_type, "bump_sequence");
        assert_eq!(
            result.operations[0].summary,
            "bump_sequence operation — full support coming soon"
        );
        assert_ne!(result.operations[0].summary, "");
        assert_eq!(result.skipped_operations, 1);
    }

    #[test]
    fn test_payment_explanations_still_populated_for_backward_compat() {
        let tx = Transaction {
            operations: vec![create_account_op("1"), create_payment_operation("2", "100")],
            ..base_tx()
        };
        let result = explain_transaction(&tx, None).unwrap();

        assert_eq!(result.payment_explanations.len(), 1);
        assert_eq!(result.payment_explanations[0].amount, "100");
    }

    #[test]
    fn test_operation_details_present_for_create_account() {
        let tx = Transaction {
            operations: vec![create_account_op("1")],
            ..base_tx()
        };
        let result = explain_transaction(&tx, None).unwrap();
        let details = &result.operations[0].details;

        assert_eq!(details["funder"], "GFUNDER");
        assert_eq!(details["account"], "GNEWACCT");
        assert_eq!(details["starting_balance"], "1.5");
    }

    #[test]
    fn test_mixed_transaction_with_unsupported_type_counts_only_that_one() {
        let tx = Transaction {
            operations: vec![
                create_payment_operation("1", "10"),
                truly_unsupported_op("2"),
                create_account_op("3"),
            ],
            ..base_tx()
        };
        let result = explain_transaction(&tx, None).unwrap();
        assert_eq!(result.operations.len(), 3);
        assert_eq!(result.skipped_operations, 1);
    }
}
