use crate::models::memo::Memo;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct Transaction {
    pub hash: String,
    pub successful: bool,
    pub fee_charged: u64,
    pub operations: Vec<Operation>,
    pub memo: Memo,
}

/// Represents a Stellar operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Operation {
    Payment(PaymentOperation),
    SetOptions(SetOptionsOperation),
    CreateAccount(CreateAccountOperation),
    ChangeTrust(ChangeTrustOperation),
    ManageOffer(ManageOfferOperation),
    PathPayment(PathPaymentOperation),
    Clawback(ClawbackOperation),
    ClawbackClaimableBalance(ClawbackClaimableBalanceOperation),
    AccountMerge(AccountMergeOperation),
    CreateClaimableBalance(CreateClaimableBalanceOperation),
    ClaimClaimableBalance(ClaimClaimableBalanceOperation),
    BeginSponsoringFutureReserves(BeginSponsoringFutureReservesOperation),
    EndSponsoringFutureReserves(EndSponsoringFutureReservesOperation),
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

/// A set_options operation that configures account settings.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct SetOptionsOperation {
    pub id: String,
    pub source_account: Option<String>,
    pub inflation_dest: Option<String>,
    pub clear_flags: Option<u32>,
    pub set_flags: Option<u32>,
    pub master_weight: Option<u32>,
    pub low_threshold: Option<u32>,
    pub med_threshold: Option<u32>,
    pub high_threshold: Option<u32>,
    pub home_domain: Option<String>,
    pub signer_key: Option<String>,
    pub signer_weight: Option<u32>,
}

/// A create_account operation that funds and activates a new Stellar account.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CreateAccountOperation {
    pub id: String,
    /// The account that funds the new account.
    pub funder: String,
    /// The newly created account address.
    pub new_account: String,
    /// Starting XLM balance sent to the new account.
    pub starting_balance: String,
}

/// A change_trust operation that adds, updates, or removes a trust line.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ChangeTrustOperation {
    pub id: String,
    /// The account opting in or out of holding the asset.
    pub trustor: String,
    pub asset_code: String,
    pub asset_issuer: String,
    /// Trust limit. "0" means remove the trust line.
    pub limit: String,
}

/// Whether the offer intends to sell or buy the named asset.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum OfferType {
    Sell,
    Buy,
}

/// A manage_offer (or manage_buy_offer) operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ManageOfferOperation {
    pub id: String,
    pub seller: String,
    pub selling_asset: String,
    pub buying_asset: String,
    pub amount: String,
    pub price: String,
    /// 0 = new offer, non-zero = update or cancel.
    pub offer_id: u64,
    pub offer_type: OfferType,
}

/// Whether the path payment fixes the send amount or the receive amount.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PathPaymentType {
    StrictSend,
    StrictReceive,
}

/// A path_payment_strict_send or path_payment_strict_receive operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PathPaymentOperation {
    pub id: String,
    pub source_account: Option<String>,
    pub destination: String,
    pub send_asset: String,
    pub send_amount: String,
    pub dest_asset: String,
    pub dest_amount: String,
    /// Intermediate assets in the conversion path.
    pub path: Vec<String>,
    pub payment_type: PathPaymentType,
}

/// A clawback operation that recovers regulated asset funds from a holder.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ClawbackOperation {
    pub id: String,
    pub source_account: Option<String>,
    /// The account the funds are clawed back from.
    pub from: String,
    pub asset_code: String,
    pub asset_issuer: String,
    pub amount: String,
}

/// A clawback_claimable_balance operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ClawbackClaimableBalanceOperation {
    pub id: String,
    pub source_account: Option<String>,
    pub balance_id: String,
}

/// An account_merge operation that merges one account into another,
/// transferring all remaining XLM and removing the source account.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AccountMergeOperation {
    pub id: String,
    /// The account being merged away (the source).
    pub source: String,
    /// The account receiving the remaining XLM balance.
    pub destination: String,
}

/// A claimant's predicate — the condition under which a claimable balance can be claimed.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ClaimPredicate {
    /// Always satisfiable.
    Unconditional,
    /// Claimable only after this absolute time (ISO 8601).
    AbsBefore(String),
    /// Epoch seconds at which the claim becomes available (mirrors absBefore).
    AbsBeforeEpoch(String),
    /// Seconds after the ledger that created the balance.
    RelBefore(String),
    /// Logical AND of two sub-predicates.
    And(Vec<ClaimPredicate>),
    /// Logical OR of two sub-predicates.
    Or(Vec<ClaimPredicate>),
    /// Logical NOT of a sub-predicate.
    Not(Box<ClaimPredicate>),
    /// Unrecognized predicate shape — either malformed JSON or a future CAP-0033
    /// variant not yet handled by this explainer. Carries the raw JSON for
    /// debugging. Renderers should describe it as an opaque condition rather
    /// than assuming the balance is freely claimable.
    Unrecognized(String),
}

/// A claimant: the destination account and predicate for a claimable balance.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Claimant {
    /// The account that may claim the balance.
    pub destination: String,
    /// The condition under which the destination may claim.
    pub predicate: ClaimPredicate,
}

impl ClaimPredicate {
    /// Build a `ClaimPredicate` from Horizon's nested JSON predicate shape.
    ///
    /// Horizon's `create_claimable_balance` response nests predicates as:
    /// ```json
    /// {
    ///   "and": [
    ///     { "relBefore": "12" },
    ///     { "not": { "unconditional": true } }
    ///   ]
    /// }
    /// ```
    pub fn from_horizon_predicate(pred: serde_json::Value) -> Self {
        if let Some(obj) = pred.as_object() {
            if obj.get("unconditional") == Some(&serde_json::Value::Bool(true)) {
                return ClaimPredicate::Unconditional;
            }
            if let Some(v) = obj.get("absBefore") {
                return ClaimPredicate::AbsBefore(v.as_str().unwrap_or("").to_string());
            }
            if let Some(v) = obj.get("absBeforeEpoch") {
                return ClaimPredicate::AbsBeforeEpoch(v.as_str().unwrap_or("").to_string());
            }
            if let Some(v) = obj.get("relBefore") {
                return ClaimPredicate::RelBefore(v.as_str().unwrap_or("").to_string());
            }
            if let Some(arr) = obj.get("and").and_then(|a| a.as_array()) {
                let predicates: Vec<ClaimPredicate> = arr
                    .iter()
                    .map(|p| ClaimPredicate::from_horizon_predicate(p.clone()))
                    .collect();
                return ClaimPredicate::And(predicates);
            }
            if let Some(arr) = obj.get("or").and_then(|a| a.as_array()) {
                let predicates: Vec<ClaimPredicate> = arr
                    .iter()
                    .map(|p| ClaimPredicate::from_horizon_predicate(p.clone()))
                    .collect();
                return ClaimPredicate::Or(predicates);
            }
            if let Some(inner) = obj.get("not") {
                return ClaimPredicate::Not(Box::new(ClaimPredicate::from_horizon_predicate(
                    inner.clone(),
                )));
            }
        }
        ClaimPredicate::Unrecognized(pred.to_string())
    }
}

/// Format a SEP-11 asset string ("native", "CODE:ISSUER") for display.
///
/// Converts to `"XLM (native)"` or `"CODE (ISSUER)"`.
pub fn format_asset_string(asset: &str) -> String {
    match asset {
        "native" => "XLM (native)".to_string(),
        s if s.contains(':') => {
            let parts: Vec<&str> = s.splitn(2, ':').collect();
            let code = parts[0];
            let issuer = if parts.len() > 1 { parts[1] } else { "" };
            format!("{code} ({issuer})")
        }
        other => other.to_string(),
    }
}

/// A create_claimable_balance operation that escrows an asset until claimant predicates are met.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CreateClaimableBalanceOperation {
    pub id: String,
    pub source_account: Option<String>,
    /// SEP-11 asset string: "native" for XLM, or "CODE:ISSUER" for credit assets.
    pub asset: String,
    /// The amount escrowed.
    pub amount: String,
    /// The list of accounts that may claim the balance and their conditions.
    pub claimants: Vec<Claimant>,
}

/// A claim_claimable_balance operation that claims a previously created claimable balance.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ClaimClaimableBalanceOperation {
    pub id: String,
    pub source_account: Option<String>,
    /// The balance ID of the claimable balance being claimed.
    pub balance_id: String,
    /// The account claiming the balance.
    pub claimant: String,
}

/// A begin_sponsoring_future_reserves operation that initiates a sponsorship.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BeginSponsoringFutureReservesOperation {
    pub id: String,
    /// The sponsoring account (the source account of this operation).
    pub source_account: Option<String>,
    /// The account whose future reserves will be sponsored.
    pub sponsored_id: String,
}

/// An end_sponsoring_future_reserves operation that terminates a sponsorship.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EndSponsoringFutureReservesOperation {
    pub id: String,
    /// The sponsored account (the source account of this operation).
    pub source_account: Option<String>,
    /// The account that initiated the sponsorship.
    pub begin_sponsor: String,
}

/// Placeholder for operation types we do not yet explain.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OtherOperation {
    pub id: String,
    pub operation_type: String,
}

impl Operation {
    pub fn is_payment(&self) -> bool {
        matches!(self, Operation::Payment(_))
    }

    pub fn is_set_options(&self) -> bool {
        matches!(self, Operation::SetOptions(_))
    }

    pub fn id(&self) -> &str {
        match self {
            Operation::Payment(p) => &p.id,
            Operation::SetOptions(s) => &s.id,
            Operation::CreateAccount(c) => &c.id,
            Operation::ChangeTrust(c) => &c.id,
            Operation::ManageOffer(m) => &m.id,
            Operation::PathPayment(p) => &p.id,
            Operation::Clawback(c) => &c.id,
            Operation::ClawbackClaimableBalance(c) => &c.id,
            Operation::AccountMerge(a) => &a.id,
            Operation::CreateClaimableBalance(c) => &c.id,
            Operation::ClaimClaimableBalance(c) => &c.id,
            Operation::BeginSponsoringFutureReserves(b) => &b.id,
            Operation::EndSponsoringFutureReserves(e) => &e.id,
            Operation::Other(o) => &o.id,
        }
    }
}

use crate::models::stellar::Asset;
use crate::services::horizon::HorizonOperation;

/// Format an asset from Horizon's separate code/issuer/type fields into
/// a single display string: "XLM (native)" or "USDC (GISSUER...)".
fn format_asset(
    asset_type: Option<&str>,
    asset_code: Option<&str>,
    asset_issuer: Option<&str>,
) -> String {
    match Asset::from_horizon_fields(asset_type, asset_code, asset_issuer) {
        Some(asset) => asset.format(),
        None => match (asset_code, asset_issuer) {
            (Some(code), Some(issuer)) => format!("{code} ({issuer})"),
            (Some(code), None) => code.to_string(),
            _ => "Unknown".to_string(),
        },
    }
}

impl From<HorizonOperation> for Operation {
    fn from(op: HorizonOperation) -> Self {
        match op.operation_type.as_str() {
            "payment" => Operation::Payment(PaymentOperation {
                id: op.id,
                source_account: op.from.clone().or(op.source_account.clone()),
                destination: op.to.unwrap_or_default(),
                asset_type: op.asset_type.unwrap_or_else(|| "native".to_string()),
                asset_code: op.asset_code,
                asset_issuer: op.asset_issuer,
                amount: op.amount.unwrap_or_else(|| "0".to_string()),
            }),
            "set_options" => Operation::SetOptions(SetOptionsOperation {
                id: op.id,
                source_account: op.source_account,
                inflation_dest: op.inflation_dest,
                // Horizon sends flags as Vec<u32> — fold into a single bitmask
                clear_flags: op
                    .clear_flags
                    .and_then(|v| v.into_iter().reduce(|a, b| a | b)),
                set_flags: op
                    .set_flags
                    .and_then(|v| v.into_iter().reduce(|a, b| a | b)),
                master_weight: op.master_key_weight,
                low_threshold: op.low_threshold,
                med_threshold: op.med_threshold,
                high_threshold: op.high_threshold,
                home_domain: op.home_domain,
                signer_key: op.signer_key,
                signer_weight: op.signer_weight,
            }),
            "create_account" => Operation::CreateAccount(CreateAccountOperation {
                id: op.id,
                funder: op.funder.unwrap_or_else(|| "Unknown".to_string()),
                new_account: op.account.unwrap_or_default(),
                starting_balance: op.starting_balance.unwrap_or_else(|| "0".to_string()),
            }),
            "change_trust" => Operation::ChangeTrust(ChangeTrustOperation {
                id: op.id,
                trustor: op.source_account.unwrap_or_else(|| "Unknown".to_string()),
                asset_code: op.asset_code.unwrap_or_default(),
                asset_issuer: op.asset_issuer.unwrap_or_default(),
                limit: op.limit.unwrap_or_else(|| "0".to_string()),
            }),
            "manage_offer" | "manage_sell_offer" | "create_passive_sell_offer" => {
                let selling = format_asset(
                    op.selling_asset_type.as_deref(),
                    op.selling_asset_code.as_deref(),
                    op.selling_asset_issuer.as_deref(),
                );
                let buying = format_asset(
                    op.buying_asset_type.as_deref(),
                    op.buying_asset_code.as_deref(),
                    op.buying_asset_issuer.as_deref(),
                );
                Operation::ManageOffer(ManageOfferOperation {
                    id: op.id,
                    seller: op.source_account.unwrap_or_else(|| "Unknown".to_string()),
                    selling_asset: selling,
                    buying_asset: buying,
                    amount: op.amount.unwrap_or_else(|| "0".to_string()),
                    price: op.price.unwrap_or_default(),
                    offer_id: op.offer_id.and_then(|s| s.parse::<u64>().ok()).unwrap_or(0),
                    offer_type: OfferType::Sell,
                })
            }
            "manage_buy_offer" => {
                let selling = format_asset(
                    op.selling_asset_type.as_deref(),
                    op.selling_asset_code.as_deref(),
                    op.selling_asset_issuer.as_deref(),
                );
                let buying = format_asset(
                    op.buying_asset_type.as_deref(),
                    op.buying_asset_code.as_deref(),
                    op.buying_asset_issuer.as_deref(),
                );
                Operation::ManageOffer(ManageOfferOperation {
                    id: op.id,
                    seller: op.source_account.unwrap_or_else(|| "Unknown".to_string()),
                    selling_asset: selling,
                    buying_asset: buying,
                    amount: op.amount.unwrap_or_else(|| "0".to_string()),
                    price: op.price.unwrap_or_default(),
                    offer_id: op.offer_id.and_then(|s| s.parse::<u64>().ok()).unwrap_or(0),
                    offer_type: OfferType::Buy,
                })
            }
            "path_payment_strict_send" => {
                let send_asset = format_asset(
                    op.source_asset_type.as_deref(),
                    op.source_asset_code.as_deref(),
                    op.source_asset_issuer.as_deref(),
                );
                let dest_asset = format_asset(
                    op.asset_type.as_deref(),
                    op.asset_code.as_deref(),
                    op.asset_issuer.as_deref(),
                );
                Operation::PathPayment(PathPaymentOperation {
                    id: op.id,
                    source_account: op.from.clone().or(op.source_account.clone()),
                    destination: op.to.unwrap_or_default(),
                    send_asset,
                    send_amount: op.source_amount.unwrap_or_else(|| "0".to_string()),
                    dest_asset,
                    dest_amount: op.amount.unwrap_or_else(|| "0".to_string()),
                    path: vec![],
                    payment_type: PathPaymentType::StrictSend,
                })
            }
            "path_payment_strict_receive" => {
                let send_asset = format_asset(
                    op.source_asset_type.as_deref(),
                    op.source_asset_code.as_deref(),
                    op.source_asset_issuer.as_deref(),
                );
                let dest_asset = format_asset(
                    op.asset_type.as_deref(),
                    op.asset_code.as_deref(),
                    op.asset_issuer.as_deref(),
                );
                Operation::PathPayment(PathPaymentOperation {
                    id: op.id,
                    source_account: op.from.clone().or(op.source_account.clone()),
                    destination: op.to.unwrap_or_default(),
                    send_asset,
                    send_amount: op.source_amount.unwrap_or_else(|| "0".to_string()),
                    dest_asset,
                    dest_amount: op.amount.unwrap_or_else(|| "0".to_string()),
                    path: vec![],
                    payment_type: PathPaymentType::StrictReceive,
                })
            }
            "clawback" => Operation::Clawback(ClawbackOperation {
                id: op.id,
                source_account: op.source_account,
                from: op.from.unwrap_or_default(),
                asset_code: op.asset_code.unwrap_or_default(),
                asset_issuer: op.asset_issuer.unwrap_or_default(),
                amount: op.amount.unwrap_or_else(|| "0".to_string()),
            }),
            "clawback_claimable_balance" => {
                Operation::ClawbackClaimableBalance(ClawbackClaimableBalanceOperation {
                    id: op.id,
                    source_account: op.source_account,
                    balance_id: op.balance_id.unwrap_or_default(),
                })
            }
            "account_merge" => Operation::AccountMerge(AccountMergeOperation {
                id: op.id,
                source: op
                    .source_account
                    .clone()
                    .or(op.account.clone())
                    .unwrap_or_else(|| "Unknown".to_string()),
                destination: op.into.unwrap_or_default(),
            }),
            "create_claimable_balance" => {
                // Horizon sends `asset` as a single SEP-11 string: "native" or "CODE:ISSUER".
                let asset = op.asset.unwrap_or_else(|| "Unknown".to_string());
                let claimants = op
                    .claimants
                    .unwrap_or_default()
                    .into_iter()
                    .map(|c| Claimant {
                        destination: c.destination,
                        predicate: ClaimPredicate::from_horizon_predicate(c.predicate),
                    })
                    .collect();
                Operation::CreateClaimableBalance(CreateClaimableBalanceOperation {
                    id: op.id,
                    source_account: op.source_account,
                    asset,
                    amount: op.amount.unwrap_or_else(|| "0".to_string()),
                    claimants,
                })
            }
            "claim_claimable_balance" => {
                Operation::ClaimClaimableBalance(ClaimClaimableBalanceOperation {
                    id: op.id,
                    source_account: op.source_account,
                    balance_id: op.balance_id.unwrap_or_default(),
                    claimant: op.claimant.unwrap_or_default(),
                })
            }
            "begin_sponsoring_future_reserves" => {
                Operation::BeginSponsoringFutureReserves(BeginSponsoringFutureReservesOperation {
                    id: op.id,
                    source_account: op.source_account,
                    sponsored_id: op.sponsored_id.unwrap_or_default(),
                })
            }
            "end_sponsoring_future_reserves" => {
                Operation::EndSponsoringFutureReserves(EndSponsoringFutureReservesOperation {
                    id: op.id,
                    source_account: op.source_account,
                    begin_sponsor: op.begin_sponsor.unwrap_or_default(),
                })
            }
            _ => Operation::Other(OtherOperation {
                id: op.id,
                operation_type: op.operation_type,
            }),
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
    fn test_is_set_options() {
        let set_opts = Operation::SetOptions(SetOptionsOperation {
            id: "op1".to_string(),
            home_domain: Some("example.com".to_string()),
            ..Default::default()
        });
        assert!(set_opts.is_set_options());
        assert!(!set_opts.is_payment());
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

    #[test]
    fn test_set_options_id() {
        let op = Operation::SetOptions(SetOptionsOperation {
            id: "set-op-99".to_string(),
            ..Default::default()
        });
        assert_eq!(op.id(), "set-op-99");
    }

    #[test]
    fn test_create_account_id() {
        let op = Operation::CreateAccount(CreateAccountOperation {
            id: "ca-1".to_string(),
            funder: "GFUNDER".to_string(),
            new_account: "GNEW".to_string(),
            starting_balance: "100".to_string(),
        });
        assert_eq!(op.id(), "ca-1");
    }

    #[test]
    fn test_change_trust_id() {
        let op = Operation::ChangeTrust(ChangeTrustOperation {
            id: "ct-1".to_string(),
            trustor: "GTRUSTEE".to_string(),
            asset_code: "USDC".to_string(),
            asset_issuer: "GISSUER".to_string(),
            limit: "1000".to_string(),
        });
        assert_eq!(op.id(), "ct-1");
    }

    #[test]
    fn test_account_merge_id() {
        let op = Operation::AccountMerge(AccountMergeOperation {
            id: "am-1".to_string(),
            source: "GSOURCE".to_string(),
            destination: "GDEST".to_string(),
        });
        assert_eq!(op.id(), "am-1");
    }

    #[test]
    fn test_format_asset_native() {
        let result = format_asset(Some("native"), None, None);
        assert_eq!(result, "XLM (native)");
    }

    #[test]
    fn test_format_asset_credit() {
        let result = format_asset(Some("credit_alphanum4"), Some("USDC"), Some("GISSUER"));
        assert_eq!(result, "USDC (GISSUER)");
    }
}
