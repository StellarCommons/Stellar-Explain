use axum::{extract::Path, Json};
use crate::models::transaction::{Operation, TransactionWithOperations};
use crate::services::explain::TxResponse;
use crate::errors::AppError;

pub async fn get_transaction(Path(hash): Path<String>) -> Result<Json<TxResponse>, AppError> {
    // Simulated fetch
    if hash == "invalid" {
        return Err(AppError::NotFound("Transaction not found".into()));
    }

    // Example mock transaction with operations for explaining
    let tx = TransactionWithOperations {
        id: hash.clone(),
        successful: true,
        source_account: "GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3".into(),
        fee_charged: "100".into(),
        operation_count: 1,
        envelope_xdr: "AAAAAgAAAABi/B0L0JGythwN1lY0aypo19NHxvLCyO5tBEcCVvwF9w3gtrOnZAAAAAAAAAPCAAAABQAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAKUE1zAAAAAAAAAAAgAAAAAGOEZGXXJWRTU=".into(),
        operations: vec![
            Operation::Payment {
                from: "GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3".into(),
                to: "GAAZI4TCR3TY5OJHCTJC2A4QSM5M8G7BNSYZ5IQQWZ2PBVOCW7YBQJ6C".into(),
                amount: "50.0000000".into(),
                asset: "XLM".into(),
            }
        ],
    };

    Ok(Json(TxResponse::from(tx)))
}
