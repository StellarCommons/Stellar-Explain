use axum::{extract::Extension, http::StatusCode, Json};
use serde::Serialize;
use std::time::Instant;
use tracing::{info, info_span, warn};
use utoipa::ToSchema;
use crate::middleware::request_id::RequestId;
use crate::services::horizon::HorizonClient;

#[derive(Serialize, ToSchema)]
pub struct HealthResponse {
    pub status: String,
    pub network: String,
    pub horizon_reachable: bool,
    pub version: String,
}

#[utoipa::path(
    get,
    path = "/health",
    responses(
        (status = 200, description = "Service is healthy", body = HealthResponse),
        (status = 503, description = "Service degraded", body = HealthResponse)
    )
)]
pub async fn health(
    Extension(request_id): Extension<RequestId>,
) -> Result<Json<HealthResponse>, (StatusCode, Json<HealthResponse>)> {
    let span = info_span!("health_request", request_id = %request_id);
    let _span_guard = span.enter();
    let request_started_at = Instant::now();

    info!(request_id = %request_id, "incoming_request");

    let horizon_url =
        std::env::var("HORIZON_URL").unwrap_or_else(|_| "https://horizon-testnet.stellar.org".into());

    let network = std::env::var("NETWORK").unwrap_or_else(|_| "testnet".into());

    let version = env!("CARGO_PKG_VERSION").to_string();

    let horizon_client = HorizonClient::new(horizon_url);

    let horizon_started_at = Instant::now();
    let horizon_reachable = horizon_client.is_reachable().await;
    let horizon_fetch_duration_ms = horizon_started_at.elapsed().as_millis() as u64;

    let response = HealthResponse {
        status: if horizon_reachable {
            "ok".into()
        } else {
            "degraded".into()
        },
        network,
        horizon_reachable,
        version,
    };

    if horizon_reachable {
        info!(
            request_id = %request_id,
            status = 200u16,
            horizon_fetch_duration_ms,
            total_duration_ms = request_started_at.elapsed().as_millis() as u64,
            "request_completed"
        );
        Ok(Json(response))
    } else {
        warn!(
            request_id = %request_id,
            status = StatusCode::SERVICE_UNAVAILABLE.as_u16(),
            horizon_fetch_duration_ms,
            total_duration_ms = request_started_at.elapsed().as_millis() as u64,
            upstream_error = "horizon_unreachable",
            "request_completed"
        );
        Err((StatusCode::SERVICE_UNAVAILABLE, Json(response)))
    }
}
