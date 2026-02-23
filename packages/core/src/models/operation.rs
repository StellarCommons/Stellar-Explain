//! Operation domain models.
//!
//! Internal representation of Stellar operations, independent of Horizon JSON.

use serde::{Deserialize, Serialize};

/// Represents a Stellar operation.
///
/// For v1, we only support Payment operations.
/// Other operation types are preserved but not explained.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Operation {
    Payment(PaymentOperation),
    ManageSellOffer(ManageOfferOperation),
    ManageBuyOffer(ManageOfferOperation),
    PathPaymentStrictSend(PathPaymentOperation),
    PathPaymentStrictReceive(PathPaymentOperation),
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum OfferType {
    Sell,
    Buy,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ManageOfferOperation {
    pub id: String,
    pub seller: String,
    pub selling_asset: String,
    pub buying_asset: String,
    pub amount: String,
    pub price: String,
    pub offer_id: u64,
    pub offer_type: OfferType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PathPaymentType {
    StrictSend,
    StrictReceive,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PathPaymentOperation {
    pub id: String,
    pub source_account: Option<String>,
    pub destination: String,
    pub send_asset: String,
    pub send_amount: String,
    pub dest_asset: String,
    pub dest_amount: String,
    pub path: Vec<String>,
    pub payment_type: PathPaymentType,
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
            Operation::ManageSellOffer(o) => &o.id,
            Operation::ManageBuyOffer(o) => &o.id,
            Operation::PathPaymentStrictSend(p) => &p.id,
            Operation::PathPaymentStrictReceive(p) => &p.id,
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

use crate::services::horizon::{HorizonOperation, HorizonPathAsset};

fn format_asset(
    asset_type: Option<String>,
    asset_code: Option<String>,
    asset_issuer: Option<String>,
) -> String {
    match asset_type.as_deref() {
        Some("native") => "XLM (native)".to_string(),
        _ => match (asset_code, asset_issuer) {
            (Some(code), Some(issuer)) => format!("{} ({})", code, issuer),
            (Some(code), None) => code,
            _ => "Unknown".to_string(),
        },
    }
}

fn format_offer_asset(
    asset_type: Option<String>,
    asset_code: Option<String>,
    asset_issuer: Option<String>,
) -> String {
    format_asset(asset_type, asset_code, asset_issuer)
}

fn format_path(path: Option<Vec<HorizonPathAsset>>) -> Vec<String> {
    path.unwrap_or_default()
        .into_iter()
        .map(|a| format_asset(Some(a.asset_type), a.asset_code, a.asset_issuer))
        .collect()
}

impl From<HorizonOperation> for Operation {
    fn from(op: HorizonOperation) -> Self {
        match op.type_i.as_str() {
            "payment" => Operation::Payment(PaymentOperation {
                id: op.id,
                source_account: op.from,
                destination: op.to.unwrap_or_default(),
                asset_type: op.asset_type.unwrap_or_else(|| "native".to_string()),
                asset_code: op.asset_code,
                asset_issuer: op.asset_issuer,
                amount: op.amount.unwrap_or_else(|| "0".to_string()),
            }),
            "manage_sell_offer" => Operation::ManageSellOffer(ManageOfferOperation {
                id: op.id,
                seller: op.source_account.unwrap_or_default(),
                selling_asset: format_offer_asset(
                    op.selling_asset_type,
                    op.selling_asset_code,
                    op.selling_asset_issuer,
                ),
                buying_asset: format_offer_asset(
                    op.buying_asset_type,
                    op.buying_asset_code,
                    op.buying_asset_issuer,
                ),
                amount: op.amount.unwrap_or_else(|| "0".to_string()),
                price: op.price.unwrap_or_default(),
                offer_id: op.offer_id.unwrap_or(0),
                offer_type: OfferType::Sell,
            }),
            "manage_buy_offer" => Operation::ManageBuyOffer(ManageOfferOperation {
                id: op.id,
                seller: op.source_account.unwrap_or_default(),
                selling_asset: format_offer_asset(
                    op.selling_asset_type,
                    op.selling_asset_code,
                    op.selling_asset_issuer,
                ),
                buying_asset: format_offer_asset(
                    op.buying_asset_type,
                    op.buying_asset_code,
                    op.buying_asset_issuer,
                ),
                amount: op.amount.unwrap_or_else(|| "0".to_string()),
                price: op.price.unwrap_or_default(),
                offer_id: op.offer_id.unwrap_or(0),
                offer_type: OfferType::Buy,
            }),
            "path_payment_strict_send" => {
                let path = format_path(op.path);
                Operation::PathPaymentStrictSend(PathPaymentOperation {
                    id: op.id,
                    source_account: op.from.or(op.source_account),
                    destination: op.to.unwrap_or_default(),
                    send_asset: format_asset(op.source_asset_type, op.source_asset_code, op.source_asset_issuer),
                    send_amount: op.source_amount.unwrap_or_else(|| "0".to_string()),
                    dest_asset: format_asset(op.asset_type, op.asset_code, op.asset_issuer),
                    dest_amount: op.amount.unwrap_or_else(|| "0".to_string()),
                    path,
                    payment_type: PathPaymentType::StrictSend,
                })
            }
            "path_payment_strict_receive" => {
                let path = format_path(op.path);
                Operation::PathPaymentStrictReceive(PathPaymentOperation {
                    id: op.id,
                    source_account: op.from.or(op.source_account),
                    destination: op.to.unwrap_or_default(),
                    send_asset: format_asset(op.source_asset_type, op.source_asset_code, op.source_asset_issuer),
                    send_amount: op.source_amount.unwrap_or_else(|| "0".to_string()),
                    dest_asset: format_asset(op.asset_type, op.asset_code, op.asset_issuer),
                    dest_amount: op.amount.unwrap_or_else(|| "0".to_string()),
                    path,
                    payment_type: PathPaymentType::StrictReceive,
                })
            }
            _ => Operation::Other(OtherOperation {
                id: op.id,
                operation_type: op.type_i,
            }),
        }
    }
}