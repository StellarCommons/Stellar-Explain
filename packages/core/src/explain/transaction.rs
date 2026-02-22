//! Transaction explanation orchestration.
//!
//! Accepts an internal transaction model and produces structured explanations.

use serde::{Deserialize, Serialize};

use crate::models::fee::FeeStats;
use crate::models::transaction::Transaction;
use crate::explain::memo::explain_memo;

use super::operation::payment::{explain_payment, PaymentExplanation};

/// Complete explanation of a transaction.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TransactionExplanation {
    pub transaction_hash: String,
    pub successful: bool,
    pub summary: String,
    pub payment_explanations: Vec<PaymentExplanation>,
    pub skipped_operations: usize,
    /// Human-readable explanation of the transaction memo.
    /// None if the transaction has no memo.
    pub memo_explanation: Option<String>,
}

/// Result type for transaction explanation.
pub type ExplainResult = Result<TransactionExplanation, ExplainError>;

/// Errors that can occur during explanation.
#[derive(Debug, Clone, PartialEq)]
pub enum ExplainError {
    /// The transaction has zero operations (truly empty).
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

/// Produce a plain-English fee explanation.
///
/// Uses FeeStats to contextualise whether the fee is standard or elevated.
/// Falls back to a simple message if fee_stats is None.
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
pub fn explain_transaction(transaction: &Transaction) -> ExplainResult {
    let total_operations = transaction.operations.len();

    if total_operations == 0 {
        return Err(ExplainError::EmptyTransaction);
    }

    let payment_count = transaction.payment_count();
    let skipped_operations = total_operations - payment_count;

    let payment_explanations = transaction
        .payment_operations()
        .into_iter()
        .map(|payment| explain_payment(payment))
        .collect::<Vec<_>>();

    let summary = build_transaction_summary(
        transaction.successful,
        payment_count,
        skipped_operations,
    );

    let memo_explanation = transaction.memo.as_ref().and_then(|m| explain_memo(m));

    let fee_explanation = explain_fee(transaction.fee_charged, fee_stats);

    // Wire in memo explanation — None if transaction has no memo
    let memo_explanation = transaction.memo.as_ref().and_then(|m| explain_memo(m));

    Ok(TransactionExplanation {
        transaction_hash: transaction.hash.clone(),
        successful: transaction.successful,
        summary,
        payment_explanations,
        skipped_operations,
        memo_explanation,
        fee_explanation,
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
    use crate::models::fee::FeeStats;
    use crate::models::memo::Memo;
    use crate::models::operation::{OtherOperation, PaymentOperation, Operation};

    fn create_payment_operation(id: &str, amount: &str) -> Operation {
        Operation::Payment(PaymentOperation {
            id: id.to_string(),
            source_account: None,
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

    fn default_fee_stats() -> FeeStats {
        FeeStats::default_network_fees()
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
    fn test_explain_fee_no_stats_fallback() {
        let result = explain_fee(100, None);
        assert!(result.contains("0.0000100"));
        // No context — just the raw amount
        assert!(!result.contains("standard"));
        assert!(!result.contains("above average"));
    }

    #[test]
    fn test_explain_transaction_includes_fee_explanation() {
    fn test_explain_single_payment_no_memo() {
        let tx = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_payment_operation("1", "50.0")],
            memo: None,
        };
        let stats = default_fee_stats();
        let explanation = explain_transaction(&tx, Some(&stats)).unwrap();
        assert!(!explanation.fee_explanation.is_empty());
        assert!(explanation.fee_explanation.contains("standard"));

        let explanation = explain_transaction(&tx).unwrap();
        assert_eq!(explanation.transaction_hash, "abc123");
        assert!(explanation.successful);
        assert_eq!(explanation.payment_explanations.len(), 1);
        assert_eq!(explanation.skipped_operations, 0);
        assert!(explanation.summary.contains("1 payment"));
        assert_eq!(explanation.memo_explanation, None);
    }

    #[test]
    fn test_explain_transaction_with_text_memo() {
        let tx = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_payment_operation("1", "50.0")],
            memo: Some(Memo::text("Invoice #12345").unwrap()),
        };

        let explanation = explain_transaction(&tx).unwrap();
        assert!(explanation.memo_explanation.is_some());
        let memo_text = explanation.memo_explanation.unwrap();
        assert!(memo_text.contains("Invoice #12345"));
        assert!(memo_text.contains("text memo"));
    }

    #[test]
    fn test_explain_transaction_with_id_memo() {
        let tx = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_payment_operation("1", "50.0")],
            memo: Some(Memo::id(987654321)),
        };

        let explanation = explain_transaction(&tx).unwrap();
        assert!(explanation.memo_explanation.is_some());
        let memo_text = explanation.memo_explanation.unwrap();
        assert!(memo_text.contains("987654321"));
        assert!(memo_text.contains("ID memo"));
    }

    #[test]
    fn test_explain_transaction_memo_none_variant() {
        let tx = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_payment_operation("1", "50.0")],
            memo: Some(Memo::None),
        };

        let explanation = explain_transaction(&tx).unwrap();
        // Memo::None should produce no explanation
        assert_eq!(explanation.memo_explanation, None);
    }

    #[test]
    fn test_explain_transaction_high_fee() {
        let tx = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 10000,
            operations: vec![create_payment_operation("1", "50.0")],
            memo: None,
        };
        let stats = default_fee_stats();
        let explanation = explain_transaction(&tx, Some(&stats)).unwrap();
        assert!(explanation.fee_explanation.contains("above average"));
    }

    #[test]
    fn test_explain_transaction_fee_stats_fallback() {

        let explanation = explain_transaction(&tx).unwrap();
        assert_eq!(explanation.payment_explanations.len(), 3);
        assert_eq!(explanation.skipped_operations, 0);
        assert!(explanation.summary.contains("3 payments"));
        assert_eq!(explanation.memo_explanation, None);
    }

    #[test]
    fn test_explain_no_payments_returns_ok() {
        let tx = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_payment_operation("1", "50.0")],
            memo: None,
        };
        // No fee stats available — should not panic, should produce basic message
        let explanation = explain_transaction(&tx, None).unwrap();
        assert!(!explanation.fee_explanation.is_empty());
    }

    #[test]
    fn test_explain_single_payment_no_memo() {

        // Non-payment transactions should return Ok with empty payment_explanations
        let result = explain_transaction(&tx);
        assert!(result.is_ok());
        let explanation = result.unwrap();
        assert_eq!(explanation.payment_explanations.len(), 0);
        assert_eq!(explanation.skipped_operations, 2);
    }

    #[test]
    fn test_explain_empty_transaction_returns_err() {
        let tx = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_payment_operation("1", "50.0")],
            memo: None,
        };
        let explanation = explain_transaction(&tx, None).unwrap();
        assert_eq!(explanation.transaction_hash, "abc123");
        assert_eq!(explanation.payment_explanations.len(), 1);
        assert_eq!(explanation.memo_explanation, None);
    }

    #[test]
    fn test_explain_transaction_with_text_memo() {
        let tx = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_payment_operation("1", "50.0")],
            memo: Some(Memo::text("Invoice #12345").unwrap()),
        };
        let explanation = explain_transaction(&tx, None).unwrap();
        assert!(explanation.memo_explanation.is_some());
        assert!(explanation.memo_explanation.unwrap().contains("Invoice #12345"));
    }

    #[test]
    fn test_explain_empty_transaction_returns_err() {
        let tx = Transaction {
            hash: "empty".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![],
            memo: None,
        };
        assert!(explain_transaction(&tx, None).is_err());

        let explanation = explain_transaction(&tx).unwrap();
        assert_eq!(explanation.payment_explanations.len(), 2);
        assert_eq!(explanation.skipped_operations, 3);
        assert!(explanation.summary.contains("2 payments"));
        assert!(explanation.summary.contains("3 other operations were skipped"));
        assert_eq!(explanation.memo_explanation, None);
    }

    #[test]
    fn test_explain_no_payments_returns_ok() {
        let tx = Transaction {
            hash: "ghi789".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_other_operation("1"), create_other_operation("2")],
            memo: None,
        };
        let result = explain_transaction(&tx, None);
        assert!(result.is_ok());
        let explanation = result.unwrap();
        assert_eq!(explanation.payment_explanations.len(), 0);
        assert_eq!(explanation.skipped_operations, 2);

        let explanation = explain_transaction(&tx).unwrap();
        assert!(!explanation.successful);
        assert!(explanation.summary.contains("failed"));
        assert_eq!(explanation.memo_explanation, None);
    }

    #[test]
    fn test_build_transaction_summary_single_payment() {
        let summary = build_transaction_summary(true, 1, 0);
        assert_eq!(summary, "This successful transaction contains 1 payment.");
    }

    #[test]
    fn test_build_transaction_summary_multiple_payments() {
        let summary = build_transaction_summary(true, 3, 0);
        assert_eq!(summary, "This successful transaction contains 3 payments.");
    }

    #[test]
    fn test_build_transaction_summary_with_skipped() {
        let summary = build_transaction_summary(true, 2, 3);
        assert_eq!(
            summary,
            "This successful transaction contains 2 payments. 3 other operations were skipped."
        );
    }

    #[test]
    fn test_build_transaction_summary_no_payments() {
        let summary = build_transaction_summary(true, 0, 2);
        assert!(summary.contains("does not yet support"));
        assert!(summary.contains("2 operations"));
    }

    #[test]
    fn test_build_transaction_summary_failed() {
        let summary = build_transaction_summary(false, 1, 0);
        assert_eq!(summary, "This failed transaction contains 1 payment.");
    }
}