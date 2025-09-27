use axum::{
    extract::Path,
    routing::get,
    Router,
    Json,
    response::IntoResponse,
};
use serde_json::{json, Value};
use reqwest::Client;
#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(|| async { "Hello, Stellar Explain!" }))
        .route("/health", get(health_check))
        .route("/tx/:hash", get(tx_handler));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("Failed to bind to address");
    println!("Listening on http://0.0.0.0:3000");
    axum::serve(listener, app).await.expect("Server error");
}

async fn health_check() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

async fn tx_handler(Path(hash): Path<String>) -> impl IntoResponse {
    match fetch_transaction(&hash).await {
        Ok(value) => (axum::http::StatusCode::OK, Json(value)).into_response(),
        Err(e) => {
            let body = json!({ "error": format!("{}", e) });
            (axum::http::StatusCode::BAD_GATEWAY, Json(body)).into_response()
        }
    }
}

async fn fetch_transaction(hash: &str) -> Result<Value, reqwest::Error> {
    // Horizon public network base URL
    let url = format!("https://horizon.stellar.org/transactions/{}", hash);
    let client = Client::builder().build()?;
    let resp = client.get(&url).send().await?;
    // Forward the JSON body as-is
    let json_val = resp.json::<Value>().await?;
    Ok(json_val)
}
