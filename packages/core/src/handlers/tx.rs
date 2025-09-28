use axum::{extract::Path, Json};
use crate::models::transaction::{Operation, Transaction};
use crate::services::explain::TxResponse;

pub async fn get_transaction(Path(hash): Path<String>) -> Json<TxResponse> {
    // Mocked data for now (later you can fetch from Horizon API)
    let tx = Transaction {
        hash: hash.clone(),
        source_account: "Alice".into(),
        operations: vec![
            Operation::Payment {
                from: "Alice".into(),
                to: "Bob".into(),
                amount: "50".into(),
                asset: "XLM".into(),
            }
        ],
    };

    Json(TxResponse::from(tx))
}
