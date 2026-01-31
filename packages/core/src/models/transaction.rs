use serde::{Deserialize, Serialize};
use crate::models::memo::Memo;
use crate::models::operation::{Operation, PaymentOperation, OtherOperation};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Transaction {
    pub hash: String,
    pub successful: bool,
    pub fee_charged: u64,
    pub operations: Vec<Operation>,
    pub memo: Option<Memo>,  // Added memo field
}

impl Transaction {
    pub fn new(
        hash: String,
        successful: bool,
        fee_charged: u64,
        operations: Vec<Operation>,
        memo: Option<Memo>,
    ) -> Self {
        Self {
            hash,
            successful,
            fee_charged,
            operations,
            memo,
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

    /// Checks if transaction has a memo attached.
    pub fn has_memo(&self) -> bool {
        self.memo.as_ref().map_or(false, |m| !m.is_none())
    }

    /// Returns the memo type as a string.
    pub fn memo_type(&self) -> Option<&str> {
        self.memo.as_ref().map(|m| m.memo_type())
    }

    /// Returns the memo if present.
    pub fn get_memo(&self) -> Option<&Memo> {
        self.memo.as_ref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_payment(amount: &str) -> Operation {
        Operation::Payment(PaymentOperation {
            id: "op123".to_string(),
            source_account: Some("GSOURCE".to_string()),
            destination: "GDEST".to_string(),
            asset_type: "native".to_string(),
            asset_code: None,
            asset_issuer: None,
            amount: amount.to_string(),
        })
    }

    fn create_unsupported() -> Operation {
        Operation::Other(OtherOperation {
            id: "unsupported_op".to_string(),
            operation_type: "unsupported".to_string(),
        })
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
            memo: None,
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
            memo: None,
        };

        let tx_without_payment = Transaction {
            hash: "tx2".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_unsupported()],
            memo: None,
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
            memo: None,
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
            memo: None,
        };

        assert!(tx.is_failed());
        assert!(!tx.successful);
    }

    #[test]
    fn test_has_memo() {
        let tx_with_memo = Transaction {
            hash: "tx1".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_payment("10")],
            memo: Some(Memo::text("test").unwrap()),
        };

        let tx_without_memo = Transaction {
            hash: "tx2".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_payment("10")],
            memo: None,
        };

        assert!(tx_with_memo.has_memo());
        assert!(!tx_without_memo.has_memo());
    }

    #[test]
    fn test_get_memo() {
        let memo = Memo::id(12345);
        let tx = Transaction {
            hash: "tx1".to_string(),
            successful: true,
            fee_charged: 100,
            operations: vec![create_payment("10")],
            memo: Some(memo.clone()),
        };

        assert_eq!(tx.get_memo(), Some(&memo));
        assert_eq!(tx.memo_type(), Some("id"));
    }
}