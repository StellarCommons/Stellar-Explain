//! Transaction domain models.
//!
//! Internal representation of Stellar transactions, independent of Horizon JSON.

use serde::{Deserialize, Serialize};

use super::operation::Operation;

/// Represents a Stellar transaction with its operations.
///
/// This is a Horizon-agnostic internal model used for explanation logic.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Transaction {
    pub hash: String,
    pub successful: bool,
    pub fee_charged: u64,
    pub operations: Vec<Operation>,
}

impl Transaction {
    pub fn new(
        hash: String,
        successful: bool,
        fee_charged: u64,
        operations: Vec<Operation>,
    ) -> Self {
        Self {
            hash,
            successful,
            fee_charged,
            operations,
        }
    }
    /// Returns all payment operations in this transaction.
    pub fn payment_operations(&self) -> Vec<&Operation> {
        self.operations
            .iter()
            .filter(|op| op.is_payment())
            .collect()
    }

    /// Returns true if this transaction contains at least one payment operation.
    pub fn has_payments(&self) -> bool {
        self.operations.iter().any(|op| op.is_payment())
    }

    /// Returns the count of payment operations.
    pub fn payment_count(&self) -> usize {
        self.operations.iter().filter(|op| op.is_payment()).count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::operation::{OtherOperation, PaymentOperation};

    fn create_payment_operation(id: &str, amount: &str) -> Operation {
        Operation::Payment(PaymentOperation {
            id: id.to_string(),
            source_account: None,
            destination: "GDEST...".to_string(),
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
    fn test_payment_operations() {
        let tx = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![
                create_payment_operation("1", "50.0"),
                create_other_operation("2"),
                create_payment_operation("3", "25.0"),
            ],
        };

        let payments = tx.payment_operations();
        assert_eq!(payments.len(), 2);
        assert_eq!(payments[0].id(), "1");
        assert_eq!(payments[1].id(), "3");
    }

    #[test]
    fn test_has_payments() {
        let tx_with_payment = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![
                create_other_operation("1"),
                create_payment_operation("2", "50.0"),
            ],
        };

        let tx_without_payment = Transaction {
            hash: "def456".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_other_operation("1"), create_other_operation("2")],
        };

        assert!(tx_with_payment.has_payments());
        assert!(!tx_without_payment.has_payments());
    }

    #[test]
    fn test_payment_count() {
        let tx = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![
                create_payment_operation("1", "50.0"),
                create_other_operation("2"),
                create_payment_operation("3", "25.0"),
                create_payment_operation("4", "10.0"),
            ],
        };

        assert_eq!(tx.payment_count(), 3);
    }
}
