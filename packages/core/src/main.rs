use axum::{
    routing::get,
    Router,
    Json,
};
use serde_json::{json, Value};

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(|| async { "Hello, Stellar Explain!" }))
        .route("/health", get(health_check));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.expect("Failed to bind to address");
    axum::serve(listener, app).await.expect("Server error"); 
}

async fn health_check() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
