//! Transaction explanation orchestration.
//!
//! Accepts an internal transaction model and produces structured explanations.

use serde::{Deserialize, Serialize};

use crate::models::operation::Operation;
use crate::models::transaction::Transaction;

use super::operation::payment::{explain_payment, PaymentExplanation};

/// Complete explanation of a transaction.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TransactionExplanation {
    pub transaction_hash: String,
    pub successful: bool,
    pub summary: String,
    pub payment_explanations: Vec<PaymentExplanation>,
    pub skipped_operations: usize,
}

/// Result type for transaction explanation.
pub type ExplainResult = Result<TransactionExplanation, ExplainError>;

/// Errors that can occur during explanation.
#[derive(Debug, Clone, PartialEq)]
pub enum ExplainError {
    /// The transaction contains no payment operations.
    NoPaymentOperations,
}

impl std::fmt::Display for ExplainError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExplainError::NoPaymentOperations => {
                write!(f, "This transaction contains no payment operations")
            }
        }
    }
}

impl std::error::Error for ExplainError {}

/// Explains a transaction by identifying payment operations and producing explanations.
///
/// This function is pure and deterministic - no IO or Horizon calls.
///
/// # Arguments
/// * `transaction` - The internal transaction model to explain
///
/// # Returns
/// * `Ok(TransactionExplanation)` - If the transaction contains at least one payment
/// * `Err(ExplainError::NoPaymentOperations)` - If there are no payment operations
///
/// # Examples
/// ```
/// use stellar_explain_core::models::transaction::Transaction;
/// use stellar_explain_core::models::operation::{Operation, PaymentOperation};
/// use stellar_explain_core::explain::transaction::explain_transaction;
///
/// let tx = Transaction {
///     hash: "abc123".to_string(),
///     successful: true,
///     fee_charged: "100".to_string(),
///     operations: vec![
///         Operation::Payment(PaymentOperation {
///             id: "1".to_string(),
///             source_account: None,
///             destination: "GDEST...".to_string(),
///             asset_type: "native".to_string(),
///             asset_code: None,
///             asset_issuer: None,
///             amount: "50.0".to_string(),
///         }),
///     ],
/// };
///
/// let explanation = explain_transaction(&tx).unwrap();
/// assert_eq!(explanation.payment_explanations.len(), 1);
/// ```
pub fn explain_transaction(transaction: &Transaction) -> ExplainResult {
    // Check if transaction contains any payment operations
    if !transaction.has_payments() {
        return Err(ExplainError::NoPaymentOperations);
    }

    let payment_count = transaction.payment_count();
    let total_operations = transaction.operations.len();
    let skipped_operations = total_operations - payment_count;

    // Generate explanations for each payment operation
    let payment_explanations = transaction
        .payment_operations()
        .into_iter()
        .filter_map(|op| {
            if let Operation::Payment(payment) = op {
                Some(explain_payment(payment))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    // Build transaction summary
    let summary = build_transaction_summary(
        transaction.successful,
        payment_count,
        skipped_operations,
    );

    Ok(TransactionExplanation {
        transaction_hash: transaction.hash.clone(),
        successful: transaction.successful,
        summary,
        payment_explanations,
        skipped_operations,
    })
}

fn build_transaction_summary(successful: bool, payment_count: usize, skipped: usize) -> String {
    let status = if successful { "successful" } else { "failed" };
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
    use crate::models::operation::{OtherOperation, PaymentOperation};

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

    #[test]
    fn test_explain_single_payment() {
        let tx = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: "100".to_string(),
            operations: vec![create_payment_operation("1", "50.0")],
        };

        let result = explain_transaction(&tx);
        assert!(result.is_ok());

        let explanation = result.unwrap();
        assert_eq!(explanation.transaction_hash, "abc123");
        assert!(explanation.successful);
        assert_eq!(explanation.payment_explanations.len(), 1);
        assert_eq!(explanation.skipped_operations, 0);
        assert!(explanation.summary.contains("1 payment"));
    }

    #[test]
    fn test_explain_multiple_payments() {
        let tx = Transaction {
            hash: "def456".to_string(),
            successful: true,
            fee_charged: "100".to_string(),
            operations: vec![
                create_payment_operation("1", "50.0"),
                create_payment_operation("2", "25.0"),
                create_payment_operation("3", "10.0"),
            ],
        };

        let result = explain_transaction(&tx);
        assert!(result.is_ok());

        let explanation = result.unwrap();
        assert_eq!(explanation.payment_explanations.len(), 3);
        assert_eq!(explanation.skipped_operations, 0);
        assert!(explanation.summary.contains("3 payments"));
    }

    #[test]
    fn test_explain_no_payments() {
        let tx = Transaction {
            hash: "ghi789".to_string(),
            successful: true,
            fee_charged: "100".to_string(),
            operations: vec![create_other_operation("1"), create_other_operation("2")],
        };

        let result = explain_transaction(&tx);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), ExplainError::NoPaymentOperations);
    }

    #[test]
    fn test_explain_mixed_operations() {
        let tx = Transaction {
            hash: "jkl012".to_string(),
            successful: true,
            fee_charged: "100".to_string(),
            operations: vec![
                create_other_operation("1"),
                create_payment_operation("2", "100.0"),
                create_other_operation("3"),
                create_payment_operation("4", "200.0"),
                create_other_operation("5"),
            ],
        };

        let result = explain_transaction(&tx);
        assert!(result.is_ok());

        let explanation = result.unwrap();
        assert_eq!(explanation.payment_explanations.len(), 2);
        assert_eq!(explanation.skipped_operations, 3);
        assert!(explanation.summary.contains("2 payments"));
        assert!(explanation.summary.contains("3 other operations were skipped"));
    }

    #[test]
    fn test_explain_failed_transaction() {
        let tx = Transaction {
            hash: "mno345".to_string(),
            successful: false,
            fee_charged: "100".to_string(),
            operations: vec![create_payment_operation("1", "50.0")],
        };

        let result = explain_transaction(&tx);
        assert!(result.is_ok());

        let explanation = result.unwrap();
        assert!(!explanation.successful);
        assert!(explanation.summary.contains("failed"));
    }

    #[test]
    fn test_build_transaction_summary_single_payment() {
        let summary = build_transaction_summary(true, 1, 0);
        assert_eq!(
            summary,
            "This successful transaction contains 1 payment."
        );
    }

    #[test]
    fn test_build_transaction_summary_multiple_payments() {
        let summary = build_transaction_summary(true, 3, 0);
        assert_eq!(
            summary,
            "This successful transaction contains 3 payments."
        );
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
    fn test_build_transaction_summary_failed() {
        let summary = build_transaction_summary(false, 1, 0);
        assert_eq!(summary, "This failed transaction contains 1 payment.");
    }
}
