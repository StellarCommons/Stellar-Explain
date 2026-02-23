use axum::{http::StatusCode, Json};
use serde::Serialize;
use utoipa::ToSchema;
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
pub async fn health() -> Result<Json<HealthResponse>, (StatusCode, Json<HealthResponse>)> {
    let horizon_url =
        std::env::var("HORIZON_URL").unwrap_or_else(|_| "https://horizon-testnet.stellar.org".into());

    let network = std::env::var("NETWORK").unwrap_or_else(|_| "testnet".into());

    let version = env!("CARGO_PKG_VERSION").to_string();

    let horizon_client = HorizonClient::new(horizon_url);

    let horizon_reachable = horizon_client.is_reachable().await;

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
        Ok(Json(response))
    } else {
        Err((StatusCode::SERVICE_UNAVAILABLE, Json(response)))
    }
}