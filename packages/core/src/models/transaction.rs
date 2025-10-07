use serde::{Deserialize, Serialize};

/// Base transaction type - matches Horizon API response
#[derive(Debug, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub successful: bool,
    pub source_account: String,
    pub fee_charged: String,
    pub operation_count: u32,
    pub envelope_xdr: String,
}

/// Extended transaction type with operations for explaining
#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionWithOperations {
    pub id: String,
    pub successful: bool,
    pub source_account: String,
    pub fee_charged: String,
    pub operation_count: u32,
    pub envelope_xdr: String,
    pub operations: Vec<Operation>,
}

/// Operation enum for explain functionality
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Operation {
    #[serde(rename = "payment")]
    Payment {
        from: String,
        to: String,
        amount: String,
        asset: String,
    },
    #[serde(rename = "manage_offer")]
    ManageOffer {
        seller: String,
        selling: String,
        buying: String,
        amount: String,
        price: String,
    },
    #[serde(rename = "create_account")]
    CreateAccount {
        funder: String,
        new_account: String,
        starting_balance: String,
    },
}

/// Payment operation - for individual parsing
#[derive(Debug, Serialize, Deserialize)]
pub struct Payment {
    #[serde(rename = "type")]
    pub kind: String,
    pub from: String,
    pub to: String,
    pub asset_type: String,
    pub amount: String,
}

/// Account creation operation - for individual parsing
#[derive(Debug, Serialize, Deserialize)]
pub struct AccountCreation {
    #[serde(rename = "type")]
    pub kind: String,
    pub funder: String,
    pub account: String,
    pub starting_balance: String,
}