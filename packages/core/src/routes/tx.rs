use axum::{
    extract::{Extension, Path, State},
    Json,
};
use serde::Serialize;
use utoipa::ToSchema;
use std::sync::Arc;
use std::time::Instant;
use tracing::{error, info, info_span};

use crate::{
    errors::AppError,
    explain::transaction::{explain_transaction_with_ledger, TransactionExplanation},
    middleware::request_id::RequestId,
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
        (status = 400, description = "Invalid transaction hash"),
        (status = 404, description = "Transaction not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_tx_explanation(
    Path(hash): Path<String>,
    State(horizon_client): State<Arc<HorizonClient>>,
    Extension(request_id): Extension<RequestId>,
) -> Result<Json<TransactionExplanation>, AppError> {
    let span = info_span!(
        "tx_explanation_request",
        request_id = %request_id,
        hash = %hash
    );
    let _span_guard = span.enter();
    let request_started_at = Instant::now();

    info!(
        request_id = %request_id,
        hash = %hash,
        "incoming_request"
    );

    if !is_valid_transaction_hash(&hash) {
        let app_error = AppError::BadRequest(
            "Invalid transaction hash format. Expected 64-character hexadecimal hash."
                .to_string(),
        );
        info!(
            request_id = %request_id,
            hash = %hash,
            status = app_error.status_code().as_u16(),
            total_duration_ms = request_started_at.elapsed().as_millis() as u64,
            error = ?app_error,
            "request_completed"
        );
        return Err(app_error);
    }

    // Fetch transaction, operations, and fee stats in parallel
    let horizon_started_at = Instant::now();
    let tx_future = horizon_client.fetch_transaction(&hash);
    let ops_future = horizon_client.fetch_operations(&hash);
    let fee_future = horizon_client.fetch_fee_stats();

    let (tx_res, ops_res, fee_stats) = tokio::join!(tx_future, ops_future, fee_future);
    let horizon_fetch_duration_ms = horizon_started_at.elapsed().as_millis() as u64;

    info!(
        request_id = %request_id,
        hash = %hash,
        horizon_fetch_duration_ms,
        fee_stats_available = fee_stats.is_some(),
        "horizon_fetch_completed"
    );

    let tx = match tx_res {
        Ok(tx) => tx,
        Err(err) => {
            let app_error: AppError = err.into();
            error!(
                request_id = %request_id,
                hash = %hash,
                horizon_fetch_duration_ms,
                total_duration_ms = request_started_at.elapsed().as_millis() as u64,
                status = app_error.status_code().as_u16(),
                error = ?app_error,
                "horizon_transaction_fetch_failed"
            );
            return Err(app_error);
        }
    };

    let ops = match ops_res {
        Ok(ops) => ops,
        Err(err) => {
            let app_error: AppError = err.into();
            error!(
                request_id = %request_id,
                hash = %hash,
                horizon_fetch_duration_ms,
                total_duration_ms = request_started_at.elapsed().as_millis() as u64,
                status = app_error.status_code().as_u16(),
                error = ?app_error,
                "horizon_operations_fetch_failed"
            );
            return Err(app_error);
        }
    };

    // Capture ledger fields before tx is consumed by map_transaction_to_domain
    let created_at = tx.created_at.clone();
    let ledger = tx.ledger;

    // fee_stats is Option<FeeStats> — None if Horizon /fee_stats is unavailable
    let domain_tx = map_transaction_to_domain(tx, ops);
    let explain_started_at = Instant::now();

    let explanation = match explain_transaction_with_ledger(
        &domain_tx,
        fee_stats.as_ref(),
        created_at.as_deref(),
        ledger,
    ) {
        Ok(explanation) => explanation,
        Err(err) => {
            let app_error: AppError = err.into();
            error!(
                request_id = %request_id,
                hash = %hash,
                explain_duration_ms = explain_started_at.elapsed().as_millis() as u64,
                total_duration_ms = request_started_at.elapsed().as_millis() as u64,
                status = app_error.status_code().as_u16(),
                error = ?app_error,
                "transaction_explain_failed"
            );
            return Err(app_error);
        }
    };
    let explain_duration_ms = explain_started_at.elapsed().as_millis() as u64;

    info!(
        request_id = %request_id,
        hash = %hash,
        explain_duration_ms,
        total_duration_ms = request_started_at.elapsed().as_millis() as u64,
        status = 200u16,
        "request_completed"
    );

    Ok(Json(explanation))
}

fn is_valid_transaction_hash(hash: &str) -> bool {
    hash.len() == 64 && hash.chars().all(|c| c.is_ascii_hexdigit())
}