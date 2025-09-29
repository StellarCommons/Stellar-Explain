use serde::{Deserialize, Serialize};

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

#[derive(Debug, Serialize, Deserialize)]
pub struct Transaction {
    pub hash: String,
    pub source_account: String,
    pub operations: Vec<Operation>,
}