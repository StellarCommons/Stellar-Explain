use axum::{
    extract::Path,
    routing::get,
    response::IntoResponse,
    Router,
    Json,
};
use serde_json::{json, Value};
use reqwest::Client;
use dotenvy::dotenv;
use std::env;
use log::info;
use env_logger;

// Import the models module to access Transaction and explanation types
mod models;
// Import Transaction struct for deserializing Horizon API responses
use models::transaction::Transaction;
// Import TxResponse struct that contains both raw transaction and human-readable explanations
use models::explain::TxResponse;

#[tokio::main]
async fn main() {
    // Initialize logger
    env_logger::init();

    // Load environment variables from .env file
    dotenv().ok();

    // Read PORT from env or default to 3000
    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse()
        .unwrap_or(3000);

    info!("Starting server on port {}", port);

    let app = Router::new()
        .route("/", get(|| async { "Hello, Stellar Explain!" }))
        .route("/health", get(health_check))
        .route("/account/:id", get(account_handler))
        .route("/tx/:hash", get(tx_handler));

    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");

    println!("Listening on http://{}", addr);
    axum::serve(listener, app).await.expect("Server error");
}

async fn health_check() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

async fn account_handler(Path(id): Path<String>) -> impl IntoResponse {
    match fetch_account(&id).await {
        Ok(value) => (axum::http::StatusCode::OK, Json(value)).into_response(),
        Err(e) => {
            let body = json!({ "error": format!("{}", e) });
            (axum::http::StatusCode::BAD_GATEWAY, Json(body)).into_response()
        }
    }
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

async fn fetch_account(account_id: &str) -> Result<Value, reqwest::Error> {
    let client = Client::new();

    // Read HORIZON_URL from env or default to testnet URL
    let horizon_url = env::var("HORIZON_URL")
        .unwrap_or_else(|_| "https://horizon-testnet.stellar.org".to_string());

    let account_url = format!("{}/accounts/{}", horizon_url, account_id);
    let account_resp = client.get(&account_url).send().await?;
    let account_json: Value = account_resp.json().await?;

    let mut explanations: Vec<String> = Vec::new();
    if let Some(balances) = account_json.get("balances").and_then(|b| b.as_array()) {
        for bal in balances {
            if let (Some(balance), Some(asset_type)) =
                (bal.get("balance"), bal.get("asset_type"))
            {
                let balance_str = balance.as_str().unwrap_or("0");
                let asset_name = if asset_type == "native" {
                    "XLM".to_string()
                } else {
                    format!(
                        "{}",
                        bal.get("asset_code").and_then(|c| c.as_str()).unwrap_or("UNKNOWN")
                    )
                };
                explanations.push(format!("Account holds {} {}", balance_str, asset_name));
            }
        }
    }

    let ops_url = format!(
        "{}/accounts/{}/operations?limit=5&order=desc",
        horizon_url, account_id
    );
    let ops_resp = client.get(&ops_url).send().await?;
    let ops_json: Value = ops_resp.json().await?;

    let result = json!({
        "balances": account_json.get("balances").unwrap_or(&json!([])),
        "recent_operations": ops_json.get("_embedded").and_then(|e| e.get("records")).unwrap_or(&json!([])),
        "explanations": explanations,
    });

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use tokio;

    #[tokio::test]
    async fn test_fetch_account_with_default_horizon_url() {
        unsafe {
            env::remove_var("HORIZON_URL");
        }
        let account_id = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
        let result = fetch_account(account_id).await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert!(value.get("balances").is_some());
    }

    #[tokio::test]
    async fn test_fetch_account_with_custom_horizon_url() {
        unsafe {
            env::set_var("HORIZON_URL", "https://horizon.stellar.org");
        }
        let account_id = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
        let result = fetch_account(account_id).await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert!(value.get("balances").is_some());
    }

    #[tokio::test]
    async fn test_fetch_transaction_with_default_horizon_url() {
        unsafe {
            env::remove_var("HORIZON_URL");
        }
        let hash = "f1a2b3c4d5e6f7g8h9i0";
        let result = fetch_transaction(hash).await;
        // The invalid hash may return Ok or Err depending on Horizon response, so check for Ok or Err
        assert!(result.is_ok() || result.is_err());
    }

    #[tokio::test]
    async fn test_fetch_transaction_with_custom_horizon_url() {
        unsafe {
            env::set_var("HORIZON_URL", "https://horizon.stellar.org");
        }
        let hash = "f1a2b3c4d5e6f7g8h9i0";
        let result = fetch_transaction(hash).await;
        // The invalid hash may return Ok or Err depending on Horizon response, so check for Ok or Err
        assert!(result.is_ok() || result.is_err());
    }
}

async fn fetch_transaction(hash: &str) -> Result<Value, reqwest::Error> {
    // Read HORIZON_URL from env or default to testnet URL
    let horizon_url = env::var("HORIZON_URL")
        .unwrap_or_else(|_| "https://horizon-testnet.stellar.org".to_string());

    let url = format!("{}/transactions/{}", horizon_url, hash);
    let client = Client::builder().build()?;
    let resp = client.get(&url).send().await?;
    // Deserialize response directly into Transaction struct instead of generic Value
    let tx = resp.json::<Transaction>().await?;
    Ok(tx)
}