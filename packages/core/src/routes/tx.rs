use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::{
    explain::transaction::{explain_transaction, TransactionExplanation},
    services::{explain::map_transaction_to_domain, horizon::HorizonClient},
    errors::HorizonError,
};

pub async fn get_tx_explanation(
    Path(hash): Path<String>,
    State(horizon_client): State<Arc<HorizonClient>>,
) -> Result<Json<TransactionExplanation>, (StatusCode, String)> {
    let tx_future = horizon_client.fetch_transaction(&hash);
    let ops_future = horizon_client.fetch_operations(&hash);

    let (tx_res, ops_res) = tokio::join!(tx_future, ops_future);

    let tx = tx_res.map_err(map_horizon_error)?;
    let ops = ops_res.map_err(map_horizon_error)?;

    let domain_tx = map_transaction_to_domain(tx, ops);

    match explain_transaction(&domain_tx) {
        Ok(explanation) => Ok(Json(explanation)),
        Err(e) => Err((StatusCode::BAD_REQUEST, e.to_string())),
    }
}

fn map_horizon_error(err: HorizonError) -> (StatusCode, String) {
    match err {
        HorizonError::TransactionNotFound => (StatusCode::NOT_FOUND, "Transaction not found".to_string()),
        _ => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string()),
    }
}
