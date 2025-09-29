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
