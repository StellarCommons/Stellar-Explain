mod models;
mod errors;
mod services;
mod explain;
mod routes;

use axum::Router;
use tracing::info;
use tokio::net::TcpListener;
use std::sync::Arc;
use std::env;

use crate::services::horizon::HorizonClient;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().init();

    let horizon_url = env::var("HORIZON_URL")
        .unwrap_or_else(|_| "https://horizon-testnet.stellar.org".to_string());
    
    info!("Using Horizon URL: {}", horizon_url);

    let horizon_client = Arc::new(HorizonClient::new(horizon_url));

    let app = Router::new()
        .route("/health", axum::routing::get(|| async { "ok" }))
        .route("/tx/:hash", axum::routing::get(routes::tx::get_tx_explanation))
        .with_state(horizon_client);

    let addr = "0.0.0.0:4000";
    info!("Stellar Explain backend running on {}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
