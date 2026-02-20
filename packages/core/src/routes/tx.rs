use axum::{
    extract::{Path, State},
    Json,
};
use std::sync::Arc;

use crate::{
    errors::AppError,
    explain::transaction::{explain_transaction, TransactionExplanation},
    services::{explain::map_transaction_to_domain, horizon::HorizonClient},
};

pub async fn get_tx_explanation(
    Path(hash): Path<String>,
    State(horizon_client): State<Arc<HorizonClient>>,
) -> Result<Json<TransactionExplanation>, AppError> {
    let tx_future = horizon_client.fetch_transaction(&hash);
    let ops_future = horizon_client.fetch_operations(&hash);

    let (tx_res, ops_res) = tokio::join!(tx_future, ops_future);

    // HorizonError converts to AppError via the From impl in errors.rs
    let tx = tx_res.map_err(AppError::from)?;
    let ops = ops_res.map_err(AppError::from)?;

    let domain_tx = map_transaction_to_domain(tx, ops);

    explain_transaction(&domain_tx)
        .map(Json)
        .map_err(|e| AppError::BadRequest(e.to_string()))
}