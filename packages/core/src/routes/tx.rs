use axum::{
    extract::{Path, State},
    Json,
};
use utoipa::ToSchema;
use std::sync::Arc;

use crate::{
    errors::AppError,
    explain::transaction::{explain_transaction, TransactionExplanation},
    services::{explain::map_transaction_to_domain, horizon::HorizonClient},
};

#[derive(Serialize, ToSchema)]
pub struct TxExplanationResponse {
    pub hash: String,
    pub successful: bool,
    pub explanation: String,
}


#[utoipa::path(
    get,
    path = "/tx/{hash}",
    params(
        ("hash" = String, Path, description = "Transaction hash")
    ),
    responses(
        (status = 200, description = "Transaction explanation", body = TxExplanationResponse),
        (status = 404, description = "Transaction not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_tx_explanation(
    Path(hash): Path<String>,
    State(horizon_client): State<Arc<HorizonClient>>,
) -> Result<Json<TransactionExplanation>, AppError> {
    // Fetch transaction, operations, and fee stats in parallel
    let tx_future = horizon_client.fetch_transaction(&hash);
    let ops_future = horizon_client.fetch_operations(&hash);
    let fee_future = horizon_client.fetch_fee_stats();

    let (tx_res, ops_res, fee_stats) = tokio::join!(tx_future, ops_future, fee_future);

    let tx = tx_res?;
    let ops = ops_res?;

    // fee_stats is Option<FeeStats> — None if Horizon /fee_stats is unavailable
    // explain_transaction degrades gracefully when it is None

    let domain_tx = map_transaction_to_domain(tx, ops);

    let explanation = explain_transaction(&domain_tx, fee_stats.as_ref())?;

    Ok(Json(explanation))
}