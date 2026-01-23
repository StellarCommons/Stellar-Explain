mod errors;
mod services;

use axum::Router;
use tracing::info;
use tokio::net::TcpListener;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().init();

    let app = Router::new()
        .route("/health", axum::routing::get(|| async { "ok" }));

    let addr = "0.0.0.0:4000";
    info!("Stellar Explain backend running on {}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
