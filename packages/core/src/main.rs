use axum::{
    extract::Path,  
    routing::get,
    response::IntoResponse,
    Router,
    Json,
};
use serde_json::{json, Value};
use reqwest::Client;  


#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(|| async { "Hello, Stellar Explain!" }))
        .route("/health", get(health_check))
        .route("/account/:id", get(account_handler)); 

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.expect("Failed to bind to address");
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

    // Build response JSON
    let result = json!({
        "balances": account_json.get("balances").unwrap_or(&json!([])),
        "recent_operations": ops_json.get("_embedded").and_then(|e| e.get("records")).unwrap_or(&json!([])),
        "explanations": explanations,
    });

    Ok(result)
}