use serde::Deserialize;
use schemars::JsonSchema;

/// Base transaction type
#[derive(Debug, Deserialize, JsonSchema)]
pub struct Transaction {
    pub id: String,
    pub successful: bool,
    pub source_account: String,
    pub fee_charged: String,
    pub operation_count: u32,
    pub envelope_xdr: String,
}

/// Payment operation
#[derive(Debug, Deserialize, JsonSchema)]
pub struct Payment {
    #[serde(rename = "type")]
    pub kind: String,
    pub from: String,
    pub to: String,
    pub asset_type: String,
    pub amount: String,
}

/// Account creation operation
#[derive(Debug, Deserialize, JsonSchema)]
pub struct AccountCreation {
    #[serde(rename = "type")]
    pub kind: String,
    pub funder: String,
    pub account: String,
    pub starting_balance: String,
}
