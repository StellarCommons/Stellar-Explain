use crate::models::transaction::{Operation, Transaction};
use serde::Serialize;

impl Operation {
    pub fn explain(&self) -> String {
        match self {
            Operation::Payment { from, to, amount, asset } => {
                format!("{} sent {} {} to {}", from, amount, asset, to)
            }
            Operation::CreateAccount { funder, new_account, starting_balance } => {
                format!("New account {} created by {} with {} XLM", new_account, funder, starting_balance)
            }
            Operation::ChangeTrust { account, asset, limit } => {
                format!("{} established trustline for {} with limit {}", account, asset, limit)
            }
            Operation::ManageOffer { seller, selling, buying, amount, price } => {
                format!("{} placed/updated offer: selling {} {} for {} {} (price {})",
                    seller, amount, selling, buying, amount, price)
            }
            Operation::PathPayment { from, to, dest_asset, dest_amount, path } => {
                format!("{} sent {} {} to {} via path {:?}",
                    from, dest_amount, dest_asset, to, path)
            }
            _ => "Unknown operation".to_string(), // fallback
        }
    }
}

#[derive(Debug, Serialize)]
pub struct TxResponse {
    pub raw: Transaction,
    pub explained: Vec<String>,
}

impl From<Transaction> for TxResponse {
    fn from(tx: Transaction) -> Self {
        let explained = tx.operations.iter().map(|op| op.explain()).collect();
        TxResponse { raw: tx, explained }
    }
}
