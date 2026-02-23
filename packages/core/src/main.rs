mod models;
mod errors;
mod services;
mod explain;
mod routes;
mod config;

use axum::{
    Router,
    routing::get,
    response::{IntoResponse, Response},
    http::{HeaderValue, Method, StatusCode, header},
    Json,
};
use tokio::net::TcpListener;
use tracing::info;
use std::{sync::Arc, env};
use serde::Serialize;
use tower::ServiceBuilder;
use tower_http::cors::{CorsLayer, AllowOrigin};
use tower_governor::{
    governor::GovernorConfigBuilder,
    GovernorLayer,
};

use crate::routes::health::health;
use crate::config::network::StellarNetwork;
use crate::services::horizon::HorizonClient;


fn rate_limit_layer() -> GovernorLayer {
    let governor_conf = GovernorConfigBuilder::default()
        .per_minute(60)
        .burst_size(60)
        .use_headers()
        .finish()
        .expect("failed to build rate limit config");

    GovernorLayer {
        config: std::sync::Arc::new(governor_conf),
        error_handler: Some(Box::new(|_| {
            Box::pin(async {
                RateLimitError {
                    error: "rate_limited",
                    message: "Too many requests. Please retry later.",
                }
                .into_response()
            })
        })),
    }
}

#[derive(Serialize)]
struct RateLimitError {
    error: &'static str,
    message: &'static str,
}

impl IntoResponse for RateLimitError {
    fn into_response(self) -> Response {
        (
            StatusCode::TOO_MANY_REQUESTS,
            Json(self),
        )
            .into_response()
    }
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().init();

    // ── Network config ────────────────────────────────────────────────────────
    let network = StellarNetwork::from_env();
    let horizon_url = env::var("HORIZON_URL")
        .unwrap_or_else(|_| network.horizon_url().to_string());

    info!("Network: {:?}", network);
    info!("Using Horizon URL: {}", horizon_url);

    // ── CORS ──────────────────────────────────────────────────────────────────
    let cors_origin = env::var("CORS_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());

    info!("Allowing CORS from: {}", cors_origin);

    let allowed_origin: HeaderValue = cors_origin
        .parse()
        .expect("CORS_ORIGIN is not a valid HTTP header value");

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact(allowed_origin))
        .allow_methods([Method::GET, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::ACCEPT]);

    // ── App State ─────────────────────────────────────────────────────────────
    let horizon_client = Arc::new(HorizonClient::new(horizon_url));

    // ── Router ────────────────────────────────────────────────────────────────
    let app = Router::new()
        .route("/health", get(health))
        .route("/tx/:hash", get(routes::tx::get_tx_explanation))
        .with_state(horizon_client)
        .layer(cors)
        .layer(
            ServiceBuilder::new()
                .layer(rate_limit_layer())
        );

    let addr = "0.0.0.0:4000";
    info!("Stellar Explain backend running on {}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}