//! Operation domain models.
//!
//! Internal representation of Stellar operations, independent of Horizon JSON.

use serde::{Deserialize, Serialize};

/// Represents a Stellar operation.
///
/// For v1, we support Payment and ChangeTrust operations.
/// Other operation types are preserved but not explained.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Operation {
    Payment(PaymentOperation),
    ChangeTrust(ChangeTrustOperation),
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

/// A change_trust operation that opts an account in or out of holding a non-native asset.
///
/// Setting limit to "0" removes the trust line; any other value adds or updates it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ChangeTrustOperation {
    pub id: String,
    pub trustor: String,
    pub asset_code: String,
    pub asset_issuer: String,
    pub limit: String,
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

    /// Returns true if this operation is a change_trust.
    pub fn is_change_trust(&self) -> bool {
        matches!(self, Operation::ChangeTrust(_))
    }

    /// Returns the operation ID.
    pub fn id(&self) -> &str {
        match self {
            Operation::Payment(p) => &p.id,
            Operation::ChangeTrust(c) => &c.id,
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
        } else if op.type_i == "change_trust" {
            Operation::ChangeTrust(ChangeTrustOperation {
                id: op.id,
                trustor: op.trustor.unwrap_or_default(),
                asset_code: op.asset_code.unwrap_or_default(),
                asset_issuer: op.asset_issuer.unwrap_or_default(),
                limit: op.limit.unwrap_or_else(|| "0".to_string()),
            })
        } else {
            Operation::Other(OtherOperation {
                id: op.id,
                operation_type: op.type_i,
            })
        }
    }
}