use axum::{extract::Path, Json};
use crate::models::transaction::{Operation, Transaction};
use crate::services::explain::TxResponse;
use crate::errors::AppError;

pub async fn get_transaction(Path(hash): Path<String>) -> Result<Json<TxResponse>, AppError> {
    // Simulated fetch
    if hash == "invalid" {
        return Err(AppError::NotFound("Transaction not found".into()));
    }

    // Example mock transaction (replace with Horizon API later)
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

    Ok(Json(TxResponse::from(tx)))
}
