use crate::models::transaction::Transaction;
use crate::models::operation::Operation;
use crate::services::horizon::{HorizonTransaction, HorizonOperation};

pub fn map_transaction_to_domain(
    tx: HorizonTransaction,
    operations: Vec<HorizonOperation>,
) -> Transaction {
    let ops = operations
        .into_iter()
        .map(Operation::from)
        .collect();

    Transaction::new(
        tx.hash,
        tx.successful,
        tx.fee_charged.parse().unwrap_or(0),
        ops,
        None,
    )
}
