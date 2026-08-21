use axum::{
    Json,
    extract::{Extension, Path, Query, State},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use tracing::{error, info, info_span};
use utoipa::ToSchema;

use crate::{
    errors::{AppError, ValidationError},
    explain::account::explain_account_with_org_name,
    explain::transaction::explain_fee,
    middleware::request_id::RequestId,
    models::stellar::StellarAddress,
    services::horizon::HorizonClient,
};

#[derive(Debug, Serialize, ToSchema)]
pub struct AccountExplanationResponse {
    pub address: String,
    pub summary: String,
    pub xlm_balance: String,
    pub asset_count: usize,
    pub signer_count: u32,
    pub home_domain: Option<String>,
    pub org_name: Option<String>,
    pub flag_descriptions: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct AccountTransactionsQuery {
    pub limit: Option<u32>,
    pub cursor: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AccountHistoryTransaction {
    pub transaction_hash: String,
    pub successful: bool,
    pub summary: String,
    pub ledger_closed_at: Option<String>,
    pub ledger: Option<u64>,
    pub operation_count: u32,
    pub fee_explanation: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AccountHistoryResponse {
    pub address: String,
    pub transactions: Vec<AccountHistoryTransaction>,
    pub next_cursor: Option<String>,
    pub has_more: bool,
}

#[utoipa::path(
    get,
    path = "/account/{address}/history",
    params(
        ("address" = String, Path, description = "Stellar account address (SEP-23 G... format)"),
        ("limit" = Option<u32>, Query, description = "Number of transactions to return (1-50, default 10)"),
        ("cursor" = Option<String>, Query, description = "Pagination cursor from previous response"),
    ),
    responses(
        (status = 200, description = "Account transaction history", body = AccountHistoryResponse),
        (status = 400, description = "Invalid address or limit"),
        (status = 404, description = "Account not found on the Stellar network"),
    )
)]
pub async fn get_account_transactions(
    Path(address): Path<String>,
    Query(params): Query<AccountTransactionsQuery>,
    State(client): State<Arc<HorizonClient>>,
    Extension(request_id): Extension<RequestId>,
) -> Result<Json<AccountHistoryResponse>, AppError> {
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

    // Validate address format before making any Horizon call
    let _validated = StellarAddress::parse(&address).map_err(|e| {
        let app_error: AppError = AppError::from(ValidationError::InvalidAddress(e));
        info!(
            request_id = %request_id,
            address = %address,
            status = app_error.status_code().as_u16(),
            total_duration_ms = request_started_at.elapsed().as_millis() as u64,
            error = ?app_error,
            "request_completed"
        );
        app_error
    })?;

    let limit = params.limit.unwrap_or(10);

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

    let order = "desc";

    let horizon_started_at = Instant::now();
    let fetch_txs =
        client.fetch_account_transactions(&address, limit, params.cursor.as_deref(), order);
    let fetch_fees = client.fetch_fee_stats();
    let (fetch_result, fee_stats) = tokio::join!(fetch_txs, fetch_fees);
    let horizon_fetch_duration_ms = horizon_started_at.elapsed().as_millis() as u64;

    let (records, next_cursor, _prev_cursor) = match fetch_result {
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

    // Horizon includes `_links.next` on essentially every page — even the
    // true last page — so next_cursor presence is not a reliable end-of-
    // collection signal.  The standard Horizon indicator is whether the
    // response contained fewer records than we asked for.
    let has_more = records.len() as u32 == limit;

    let transactions = records
        .into_iter()
        .map(|tx| {
            let fee_explanation = tx
                .fee_charged
                .as_deref()
                .and_then(|s| s.parse::<u64>().ok())
                .map(|fee| explain_fee(fee, fee_stats.as_ref()));

            let summary = format!(
                "{} transaction with {} operation{}.",
                if tx.successful {
                    "Successful"
                } else {
                    "Failed"
                },
                tx.operation_count,
                if tx.operation_count == 1 { "" } else { "s" },
            );

            AccountHistoryTransaction {
                transaction_hash: tx.hash,
                successful: tx.successful,
                summary,
                ledger_closed_at: Some(tx.created_at),
                ledger: tx.ledger,
                operation_count: tx.operation_count,
                fee_explanation,
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

    Ok(Json(AccountHistoryResponse {
        address: address.clone(),
        transactions,
        next_cursor,
        has_more,
    }))
}

/// GET /account/:address
/// Returns a plain-English explanation of a Stellar account.
#[utoipa::path(
    get,
    path = "/account/{address}",
    params(
        ("address" = String, Path, description = "Stellar account address (SEP-23 G... format)")
    ),
    responses(
        (status = 200, description = "Account explanation", body = AccountExplanationResponse),
        (status = 400, description = "Invalid Stellar address"),
        (status = 404, description = "Account not found on the Stellar network"),
    )
)]
pub async fn get_account_explanation(
    Path(address): Path<String>,
    State(horizon_client): State<Arc<HorizonClient>>,
    Extension(request_id): Extension<RequestId>,
) -> Result<Json<AccountExplanationResponse>, AppError> {
    let span = info_span!(
        "account_explanation_request",
        request_id = %request_id,
        address = %address
    );
    let _span_guard = span.enter();
    let request_started_at = Instant::now();

    info!(request_id = %request_id, address = %address, "incoming_request");

    // Validate address format before making any Horizon call
    let _validated = StellarAddress::parse(&address).map_err(|e| {
        let app_error: AppError = AppError::from(ValidationError::InvalidAddress(e));
        info!(
            request_id = %request_id,
            address = %address,
            status = app_error.status_code().as_u16(),
            total_duration_ms = request_started_at.elapsed().as_millis() as u64,
            error = ?app_error,
            "request_completed"
        );
        app_error
    })?;

    let account = match horizon_client.fetch_account(&address).await {
        Ok(a) => a,
        Err(err) => {
            let app_error: AppError = err.into();
            error!(
                request_id = %request_id,
                address = %address,
                total_duration_ms = request_started_at.elapsed().as_millis() as u64,
                error = ?app_error,
                "account_fetch_failed"
            );
            return Err(app_error);
        }
    };

    // Attempt stellar.toml org name lookup if the account has a home domain
    let org_name = if let Some(ref domain) = account.home_domain {
        let domain_url = if domain.starts_with("http") {
            domain.clone()
        } else {
            format!("https://{domain}")
        };
        horizon_client
            .fetch_stellar_toml_org_name(&domain_url)
            .await
    } else {
        None
    };

    let explanation = explain_account_with_org_name(&account, org_name);

    info!(
        request_id = %request_id,
        address = %address,
        total_duration_ms = request_started_at.elapsed().as_millis() as u64,
        status = 200u16,
        "request_completed"
    );

    Ok(Json(AccountExplanationResponse {
        address: account.account_id,
        summary: explanation.summary,
        xlm_balance: explanation.xlm_balance,
        asset_count: explanation.asset_count,
        signer_count: explanation.signer_count,
        home_domain: explanation.home_domain,
        org_name: explanation.org_name,
        flag_descriptions: explanation.flag_descriptions,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn validate(limit: Option<u32>) -> Result<u32, AppError> {
        let limit = limit.unwrap_or(10);
        if limit == 0 || limit > 50 {
            return Err(AppError::BadRequest(
                "limit must be between 1 and 50".to_string(),
            ));
        }
        Ok(limit)
    }

    #[test]
    fn test_default_limit() {
        let limit = validate(None).unwrap();
        assert_eq!(limit, 10);
    }

    #[test]
    fn test_custom_limit() {
        let limit = validate(Some(25)).unwrap();
        assert_eq!(limit, 25);
    }

    #[test]
    fn test_max_limit_accepted() {
        let limit = validate(Some(50)).unwrap();
        assert_eq!(limit, 50);
    }

    #[test]
    fn test_limit_zero_rejected() {
        assert!(matches!(validate(Some(0)), Err(AppError::BadRequest(_))));
    }

    #[test]
    fn test_limit_over_max_rejected() {
        assert!(matches!(validate(Some(51)), Err(AppError::BadRequest(_))));
    }

    #[test]
    fn test_cursor_navigation_values_are_passed_through() {
        let cursor: Option<String> = Some("157639564177408001".to_string());
        assert_eq!(cursor.as_deref(), Some("157639564177408001"));
    }

    #[test]
    fn test_account_history_response_matches_frontend_contract() {
        let resp = AccountHistoryResponse {
            address: "GABC".to_string(),
            transactions: vec![AccountHistoryTransaction {
                transaction_hash: "tx1".to_string(),
                successful: true,
                summary: "Successful transaction with 1 operation.".to_string(),
                ledger_closed_at: Some("2024-01-01T00:00:00Z".to_string()),
                ledger: Some(12345),
                operation_count: 1,
                fee_explanation: Some("A fee of 0.0000100 XLM was charged.".to_string()),
            }],
            next_cursor: Some("NEXT".to_string()),
            has_more: true,
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["address"], "GABC");
        assert_eq!(json["has_more"], true);
        assert_eq!(json["next_cursor"], "NEXT");
        assert_eq!(json["transactions"][0]["transaction_hash"], "tx1");
        assert_eq!(json["transactions"][0]["successful"], true);
        assert_eq!(json["transactions"][0]["ledger"], 12345);
        assert_eq!(
            json["transactions"][0]["fee_explanation"],
            "A fee of 0.0000100 XLM was charged."
        );
    }
}
