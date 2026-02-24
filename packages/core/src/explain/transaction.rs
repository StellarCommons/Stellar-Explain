//! Transaction explanation orchestration.
//!
//! Accepts an internal transaction model and produces structured explanations.

use serde::{Deserialize, Serialize};

use crate::explain::memo::explain_memo;
use crate::models::fee::FeeStats;
use crate::models::transaction::Transaction;

use super::operation::payment::{
    explain_payment,
    explain_payment_with_fee,
    PaymentExplanation,
};

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
    /// Human-readable explanation of transaction fee context.
    pub fee_explanation: Option<String>,
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

    let summary = build_transaction_summary(transaction.successful, payment_count, skipped_operations);
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
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_payment_operation("1", "50.0")],
            memo: Some(Memo::text("Invoice #12345").unwrap()),
        };

        let explanation = explain_transaction(&tx, None).unwrap();
        assert_eq!(explanation.transaction_hash, "abc123");
        assert!(explanation.memo_explanation.is_some());
        assert!(explanation
            .memo_explanation
            .unwrap()
            .contains("Invoice #12345"));
        assert!(explanation.fee_explanation.is_some());
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
    }

    #[test]
    fn test_build_transaction_summary_failed() {
        let summary = build_transaction_summary(false, 1, 0);
        assert_eq!(summary, "This failed transaction contains 1 payment.");
    }
}
