use serde::{Deserialize, Serialize};

/// Base transaction type - matches Horizon API response
#[derive(Debug, Serialize, Deserialize, Clone)]
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
    #[serde(flatten)]
    pub transaction: Transaction,
    // This field is populated manually after fetching operations
    pub operations: Vec<Operation>,
}

/// Operation enum for explain functionality
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum Operation {
    #[serde(rename = "payment")]
    Payment {
        from: String,
        to: String,
        amount: String,
        asset: String,
    },
    #[serde(rename = "create_account")]
    CreateAccount {
        funder: String,
        #[serde(rename = "account")]
        new_account: String,
        starting_balance: String,
    },
    #[serde(rename = "change_trust")]
    ChangeTrust {
        account: String,
        asset: String,
        limit: String,
    },
    #[serde(rename = "manage_offer")]
    ManageOffer {
        seller: String,
        selling: String,
        buying: String,
        amount: String,
        price: String,
    },
    #[serde(rename = "path_payment")]
    PathPayment {
        from: String,
        to: String,
        dest_asset: String,
        dest_amount: String,
        path: Vec<String>,
    },
}

// Helper struct for deserializing operations from Horizon
#[derive(Debug, Deserialize)]
pub(crate) struct OperationsResponse {
    pub _embedded: EmbeddedOperations,
}

#[derive(Debug, Deserialize)]
pub(crate) struct EmbeddedOperations {
    pub records: Vec<Operation>,
}