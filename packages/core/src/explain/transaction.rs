//! Transaction explanation orchestration.

use serde::{Deserialize, Serialize};

use crate::explain::memo::explain_memo;
use crate::models::fee::FeeStats;
use crate::models::transaction::Transaction;

use super::operation::payment::{explain_payment, explain_payment_with_fee, PaymentExplanation};

/// Complete explanation of a transaction.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TransactionExplanation {
    pub transaction_hash: String,
    pub successful: bool,
    pub summary: String,
    pub payment_explanations: Vec<PaymentExplanation>,
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

    format!("{} at {} UTC", date, hhmm)
}

/// Produce a plain-English fee explanation.
pub fn explain_fee(fee_charged: u64, fee_stats: Option<&FeeStats>) -> String {
    let xlm = FeeStats::stroops_to_xlm(fee_charged);
    match fee_stats {
        None => format!("A fee of {} XLM was charged.", xlm),
        Some(stats) => {
            if stats.is_high_fee(fee_charged) {
                let multiplier = fee_charged / stats.base_fee.max(1);
                format!(
                    "A fee of {} XLM was charged. This is above average — {}x the base fee.",
                    xlm, multiplier
                )
            } else {
                format!("A fee of {} XLM was charged. This is a standard network fee.", xlm)
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
    let skipped_operations = total_operations - payment_count;

    let payment_explanations = transaction
        .payment_operations()
        .into_iter()
        .map(|payment| match fee_stats {
            Some(stats) => explain_payment_with_fee(payment, transaction.fee_charged, stats),
            None => explain_payment(payment),
        })
        .collect::<Vec<_>>();

    let base_summary = build_transaction_summary(transaction.successful, payment_count, skipped_operations);

    // Enrich summary with ledger time if available
    let summary = match (created_at, ledger) {
        (Some(ts), Some(seq)) => {
            let formatted_time = format_ledger_time(ts);
            format!(
                "{} This transaction was confirmed on {} (ledger #{}).",
                base_summary, formatted_time, seq
            )
        }
        (Some(ts), None) => {
            let formatted_time = format_ledger_time(ts);
            format!("{} This transaction was confirmed on {}.", base_summary, formatted_time)
        }
        (None, Some(seq)) => {
            format!("{} Included in ledger #{}.", base_summary, seq)
        }
        (None, None) => base_summary,
    };

    let memo_explanation = transaction.memo.as_ref().and_then(explain_memo);
    let fee_explanation = Some(explain_fee(transaction.fee_charged, fee_stats));

    Ok(TransactionExplanation {
        transaction_hash: transaction.hash.clone(),
        successful: transaction.successful,
        summary,
        payment_explanations,
        skipped_operations,
        memo_explanation,
        fee_explanation,
        ledger_closed_at: created_at.map(|s| s.to_string()),
        ledger,
    })
}

fn build_transaction_summary(successful: bool, payment_count: usize, skipped: usize) -> String {
    let status = if successful { "successful" } else { "failed" };

    if payment_count == 0 {
        let op_word = if skipped == 1 { "operation" } else { "operations" };
        return format!(
            "This {} transaction contains {} {} that Stellar Explain does not yet support.",
            status, skipped, op_word
        );
    }

    let payment_text = if payment_count == 1 {
        "1 payment".to_string()
    } else {
        format!("{} payments", payment_count)
    };

    let mut parts = vec![format!("This {} transaction contains {}", status, payment_text)];

    if skipped > 0 {
        let skipped_text = if skipped == 1 {
            "1 other operation was skipped".to_string()
        } else {
            format!("{} other operations were skipped", skipped)
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
        assert_eq!(result.ledger_closed_at.as_deref(), Some("2024-01-15T14:32:00Z"));
        assert_eq!(result.ledger, Some(49823145));
    }

    #[test]
    fn test_explain_transaction_with_time_only() {
        let result = explain_transaction_with_ledger(
            &base_tx(),
            None,
            Some("2024-06-20T09:00:00Z"),
            None,
        )
        .unwrap();

        assert!(result.summary.contains("2024-06-20 at 09:00 UTC"));
        assert!(!result.summary.contains("ledger #"));
        assert_eq!(result.ledger, None);
    }

    #[test]
    fn test_explain_transaction_with_ledger_only() {
        let result = explain_transaction_with_ledger(
            &base_tx(),
            None,
            None,
            Some(12345678),
        )
        .unwrap();

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
        assert!(explanation.memo_explanation.unwrap().contains("Invoice #12345"));
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
}