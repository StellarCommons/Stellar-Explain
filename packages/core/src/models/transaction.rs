use serde::{Deserialize, Serialize};

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
    #[serde(rename = "create_account")]
    CreateAccount {
        funder: String,
        new_account: String,
        starting_balance: String,
    },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Transaction {
    pub hash: String,
    pub source_account: String,
    pub operations: Vec<Operation>,
}
