//! Operation domain models.
//!
//! Internal representation of Stellar operations, independent of Horizon JSON.

use crate::models::memo::Memo;


#[derive(Debug, Clone)]
pub struct Transaction {
    pub hash: String,
    pub successful: bool,
    pub fee_charged: u64,
    pub operations: Vec<Operation>,
    pub memo: Memo,

}





use serde::{Deserialize, Serialize};

/// Represents a Stellar operation.
///
/// For v1, we only support Payment operations.
/// Other operation types are preserved but not explained.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Operation {
    Payment(PaymentOperation),
    Other(OtherOperation),
}

/// A payment operation that sends an asset from one account to another.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PaymentOperation {
    pub id: String,
    pub source_account: Option<String>,
    pub destination: String,
    pub asset_type: String,
    pub asset_code: Option<String>,
    pub asset_issuer: Option<String>,
    pub amount: String,
}

/// Placeholder for non-payment operations.
///
/// These are preserved in the transaction model but not explained in v1.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OtherOperation {
    pub id: String,
    pub operation_type: String,
}

impl Operation {
    /// Returns true if this operation is a payment.
    pub fn is_payment(&self) -> bool {
        matches!(self, Operation::Payment(_))
    }

    /// Returns the operation ID.
    pub fn id(&self) -> &str {
        match self {
            Operation::Payment(p) => &p.id,
            Operation::Other(o) => &o.id,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_payment() {
        let payment = Operation::Payment(PaymentOperation {
            id: "12345".to_string(),
            source_account: None,
            destination: "GDEST...".to_string(),
            asset_type: "native".to_string(),
            asset_code: None,
            asset_issuer: None,
            amount: "100.0".to_string(),
        });

        let other = Operation::Other(OtherOperation {
            id: "67890".to_string(),
            operation_type: "create_account".to_string(),
        });

        assert!(payment.is_payment());
        assert!(!other.is_payment());
    }

    #[test]
    fn test_operation_id() {
        let payment = Operation::Payment(PaymentOperation {
            id: "12345".to_string(),
            source_account: None,
            destination: "GDEST...".to_string(),
            asset_type: "native".to_string(),
            asset_code: None,
            asset_issuer: None,
            amount: "100.0".to_string(),
        });

        assert_eq!(payment.id(), "12345");
    }
}

use crate::services::horizon::HorizonOperation;

impl From<HorizonOperation> for Operation {
    fn from(op: HorizonOperation) -> Self {
        if op.type_i == "payment" {
            Operation::Payment(PaymentOperation {
                id: op.id,
                source_account: op.from,
                destination: op.to.unwrap_or_default(),
                asset_type: op.asset_type.unwrap_or_else(|| "native".to_string()),
                asset_code: op.asset_code,
                asset_issuer: op.asset_issuer,
                amount: op.amount.unwrap_or_else(|| "0".to_string()),
            })
        } else {
            Operation::Other(OtherOperation {
                id: op.id,
                operation_type: op.type_i,
            })
        }
    }
}