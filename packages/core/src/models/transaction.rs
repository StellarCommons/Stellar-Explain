use serde::{Deserialize, Serialize};

use crate::models::operation::{Operation, PaymentOperation, Asset};

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


    pub fn payment_operations(&self) -> Vec<&PaymentOperation> {
        self.operations
            .iter()
            .filter_map(|op| match op {
                Operation::Payment(p) => Some(p),
                _ => None,
            })
            .collect()
    }


    pub fn has_payments(&self) -> bool {
        self.operations.iter().any(|op| matches!(op, Operation::Payment(_)))
    }


    pub fn payment_count(&self) -> usize {
        self.operations
            .iter()
            .filter(|op| matches!(op, Operation::Payment(_)))
            .count()
    }





    pub fn is_failed(&self) -> bool {
        !self.successful
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_payment(amount: &str) -> Operation {
        Operation::Payment(PaymentOperation {
            from: "GSOURCE".to_string(),
            to: "GDEST".to_string(),
            asset: Asset::Native,
            amount: amount.to_string(),
        })
    }

    fn create_unsupported() -> Operation {
        Operation::Unsupported
    }

    #[test]
    fn test_payment_operations() {
        let tx = Transaction {
            hash: "abc123".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![
                create_payment("50"),
                create_unsupported(),
                create_payment("25"),
            ],
        };

        let payments = tx.payment_operations();
        assert_eq!(payments.len(), 2);
        assert_eq!(payments[0].amount, "50");
        assert_eq!(payments[1].amount, "25");
    }

    #[test]
    fn test_has_payments() {
        let tx_with_payment = Transaction {
            hash: "tx1".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![
                create_unsupported(),
                create_payment("10"),
            ],
        };

        let tx_without_payment = Transaction {
            hash: "tx2".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_unsupported()],
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
                create_payment("50"),
                create_unsupported(),
                create_payment("25"),
                create_payment("10"),
            ],
        };

        assert_eq!(tx.payment_count(), 3);
    }

    #[test]
    fn test_failed_transaction_flag() {
        let tx = Transaction {
            hash: "failedtx".to_string(),
            successful: false,
            fee_charged: 100,
            operations: vec![create_payment("100")],
        };

        assert!(tx.is_failed());
        assert!(!tx.successful);
    }
}
