mod models;
mod errors;
mod services;
mod explain;
mod routes;
mod config;

use axum::Router;
use tracing::info;
use tokio::net::TcpListener;
use std::sync::Arc;
use std::env;
use tower_http::cors::{CorsLayer, AllowOrigin};
use axum::http::{HeaderValue, Method, header};
use axum::routing::get;
use crate::routes::health::health;
use crate::config::network::StellarNetwork;
use crate::services::horizon::HorizonClient;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().init();

    // ── Network config ────────────────────────────────────────────────────────
    // StellarNetwork reads STELLAR_NETWORK from env (defaults to Public).
    // HORIZON_URL can still override if explicitly set — useful for custom nodes.
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

    // ── App ───────────────────────────────────────────────────────────────────
    let horizon_client = Arc::new(HorizonClient::new(horizon_url));

    let app = Router::new()
        .route("/health", axum::routing::get(|| async { "ok" }))
        .route("/tx/:hash", axum::routing::get(routes::tx::get_tx_explanation))
        .route("/health", get(health))
        .with_state(horizon_client)
        .layer(cors);

    let addr = "0.0.0.0:4000";
    info!("Stellar Explain backend running on {}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}