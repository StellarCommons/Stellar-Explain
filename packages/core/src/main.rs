use axum::{
    extract::Path,
    routing::get,
    response::IntoResponse,
    Router,
    Json,
};
use serde_json::{json, Value};
use reqwest::Client;

// Import the models module to access Transaction and explanation types
mod models;
// Import Transaction struct for deserializing Horizon API responses
use models::transaction::Transaction;
// Import TxResponse struct that contains both raw transaction and human-readable explanations
use models::explain::TxResponse;
use crate::models::transaction::{OperationsResponse, TransactionWithOperations};

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(|| async { "Hello, Stellar Explain!" }))
        .route("/health", get(health_check))
        .route("/account/:id", get(account_handler))
        .route("/tx/:hash", get(tx_handler)); // Added route for transaction explanations
    
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("Failed to bind to address");

    println!("Listening on http://0.0.0.0:3000");
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

async fn tx_handler(Path(hash): Path<String>) -> impl IntoResponse {
    match fetch_transaction_with_operations(&hash).await {
        Ok(tx) => {
            // Convert Transaction into TxResponse to add operation explanations
            let response: TxResponse = tx.into();
            (axum::http::StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            let body = json!({ "error": format!("{}", e) });
            (axum::http::StatusCode::BAD_GATEWAY, Json(body)).into_response()
        }
    }
}

async fn fetch_account(account_id: &str) -> Result<Value, reqwest::Error> {
    let client = Client::new();
    let account_url = format!("https://horizon.stellar.org/accounts/{}", account_id);
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
        "https://horizon.stellar.org/accounts/{}/operations?limit=5&order=desc",
        account_id
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

// Changed return type from Value to Transaction for proper type safety and explanation support
async fn fetch_transaction(hash: &str) -> Result<Transaction, Box<dyn std::error::Error>> {
    let url = format!("https://horizon.stellar.org/transactions/{}", hash);
    let client = Client::builder().build()?;
    let resp = client.get(&url).send().await?;
    // Forward the JSON body as-is
    let json_val = resp.json::<Value>().await?;
    Ok(json_val)
}