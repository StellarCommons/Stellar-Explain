use crate::models::transaction::{Operation, TransactionWithOperations, Transaction};
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

impl From<TransactionWithOperations> for TxResponse {
    fn from(tx: TransactionWithOperations) -> Self {
        let explained = tx.operations.iter().map(|op| op.explain()).collect();
        let raw = Transaction {
            id: tx.id,
            successful: tx.successful,
            source_account: tx.source_account,
            fee_charged: tx.fee_charged,
            operation_count: tx.operation_count,
            envelope_xdr: tx.envelope_xdr,
        };
        TxResponse { raw, explained }
    }
}
