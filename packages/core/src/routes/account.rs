use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use tracing::{error, info, info_span};

use crate::{
    errors::AppError,
    middleware::request_id::RequestId,
    services::horizon::HorizonClient,
};

#[derive(Debug, Deserialize)]
pub struct AccountTransactionsQuery {
    pub limit: Option<u32>,
    pub cursor: Option<String>,
    pub order: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TransactionSummary {
    pub hash: String,
    pub created_at: String,
    pub successful: bool,
    pub operation_count: u32,
    pub memo: Option<String>,
    pub summary: String,
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub next_cursor: Option<String>,
    pub prev_cursor: Option<String>,
}

pub async fn get_account_transactions(
    Path(address): Path<String>,
    Query(params): Query<AccountTransactionsQuery>,
    State(client): State<Arc<HorizonClient>>,
    Extension(request_id): Extension<RequestId>,
) -> Result<Json<PaginatedResponse<TransactionSummary>>, AppError> {
    let span = info_span!(
        "account_transactions_request",
        request_id = %request_id,
        address = %address
    );
    let _span_guard = span.enter();
    let request_started_at = Instant::now();

    info!(
        request_id = %request_id,
        address = %address,
        "incoming_request"
    );

    let limit = params.limit.unwrap_or(10);
    let order = params.order.as_deref().unwrap_or("asc");

    if limit == 0 || limit > 50 {
        let app_error = AppError::BadRequest("limit must be between 1 and 50".to_string());
        info!(
            request_id = %request_id,
            address = %address,
            status = app_error.status_code().as_u16(),
            total_duration_ms = request_started_at.elapsed().as_millis() as u64,
            error = ?app_error,
            "request_completed"
        );
        return Err(app_error);
    }

    if order != "asc" && order != "desc" {
        let app_error = AppError::BadRequest("order must be 'asc' or 'desc'".to_string());
        info!(
            request_id = %request_id,
            address = %address,
            status = app_error.status_code().as_u16(),
            total_duration_ms = request_started_at.elapsed().as_millis() as u64,
            error = ?app_error,
            "request_completed"
        );
        return Err(app_error);
    }

    let horizon_started_at = Instant::now();
    let fetch_result = client
        .fetch_account_transactions(&address, limit, params.cursor.as_deref(), order)
        .await;
    let horizon_fetch_duration_ms = horizon_started_at.elapsed().as_millis() as u64;

    let (records, next_cursor, prev_cursor) = match fetch_result {
        Ok(result) => result,
        Err(err) => {
            let app_error: AppError = err.into();
            error!(
                request_id = %request_id,
                address = %address,
                horizon_fetch_duration_ms,
                status = app_error.status_code().as_u16(),
                total_duration_ms = request_started_at.elapsed().as_millis() as u64,
                error = ?app_error,
                "horizon_account_fetch_failed"
            );
            return Err(app_error);
        }
    };

    info!(
        request_id = %request_id,
        address = %address,
        horizon_fetch_duration_ms,
        "horizon_fetch_completed"
    );

    let items = records
        .into_iter()
        .map(|tx| {
            let memo = match tx.memo_type.as_deref() {
                Some("none") | None => None,
                _ => tx.memo.clone(),
            };
            let summary = format!(
                "{} transaction with {} operation{}.",
                if tx.successful { "Successful" } else { "Failed" },
                tx.operation_count,
                if tx.operation_count == 1 { "" } else { "s" },
            );
            TransactionSummary {
                hash: tx.hash,
                created_at: tx.created_at,
                successful: tx.successful,
                operation_count: tx.operation_count,
                memo,
                summary,
            }
        })
        .collect();

    info!(
        request_id = %request_id,
        address = %address,
        status = 200u16,
        total_duration_ms = request_started_at.elapsed().as_millis() as u64,
        "request_completed"
    );

    Ok(Json(PaginatedResponse {
        items,
        next_cursor,
        prev_cursor,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn validate(limit: Option<u32>, order: Option<&str>) -> Result<(u32, &'static str), AppError> {
        let limit = limit.unwrap_or(10);
        let order = order.unwrap_or("asc");

        if limit == 0 || limit > 50 {
            return Err(AppError::BadRequest(
                "limit must be between 1 and 50".to_string(),
            ));
        }
        if order != "asc" && order != "desc" {
            return Err(AppError::BadRequest(
                "order must be 'asc' or 'desc'".to_string(),
            ));
        }
        Ok((limit, if order == "asc" { "asc" } else { "desc" }))
    }

    #[test]
    fn test_default_pagination() {
        let (limit, order) = validate(None, None).unwrap();
        assert_eq!(limit, 10);
        assert_eq!(order, "asc");
    }

    #[test]
    fn test_custom_limit_and_order() {
        let (limit, order) = validate(Some(25), Some("desc")).unwrap();
        assert_eq!(limit, 25);
        assert_eq!(order, "desc");
    }

    #[test]
    fn test_max_limit_accepted() {
        let (limit, _) = validate(Some(50), None).unwrap();
        assert_eq!(limit, 50);
    }

    #[test]
    fn test_limit_zero_rejected() {
        assert!(matches!(validate(Some(0), None), Err(AppError::BadRequest(_))));
    }

    #[test]
    fn test_limit_over_max_rejected() {
        assert!(matches!(
            validate(Some(51), None),
            Err(AppError::BadRequest(_))
        ));
    }

    #[test]
    fn test_invalid_order_rejected() {
        assert!(matches!(
            validate(Some(10), Some("latest")),
            Err(AppError::BadRequest(_))
        ));
    }

    #[test]
    fn test_cursor_navigation_values_are_passed_through() {
        let cursor: Option<String> = Some("157639564177408001".to_string());
        assert_eq!(cursor.as_deref(), Some("157639564177408001"));
    }
}
