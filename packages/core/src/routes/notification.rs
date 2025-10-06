use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::Mutex;
use reqwest::Client;

#[derive(Clone)]
pub struct AppState {
    pub client: Client,
    pub subscriptions: Arc<Mutex<HashMap<String, Vec<String>>>>, 
}

#[derive(Deserialize)]
pub struct WatchRequest {
    pub webhook_url: String,
}

#[derive(Serialize)]
pub struct WatchResponse {
    message: String,
}

pub fn notification_routes(state: AppState) -> Router {
    Router::new()
        .route("/watch/:account", post(watch_account))
        .route("/notify/:account", get(trigger_notification))
        .with_state(state)
}

async fn watch_account(
    State(state): State<AppState>,
    Path(account): Path<String>,
    Json(payload): Json<WatchRequest>,
) -> Json<WatchResponse> {
    let mut subs = state.subscriptions.lock().await;
    subs.entry(account.clone())
        .or_default()
        .push(payload.webhook_url.clone());

    Json(WatchResponse {
        message: format!("Subscribed to account: {}", account),
    })
}

async fn trigger_notification(
    State(state): State<AppState>,
    Path(account): Path<String>,
) -> Json<serde_json::Value> {
    let subs = state.subscriptions.lock().await;
    let Some(webhooks) = subs.get(&account) else {
        return Json(json!({ "message": "No subscriptions found" }));
    };

    for url in webhooks.iter() {
        let _ = state
            .client
            .post(url)
            .json(&json!({ "account": account, "event": "new_transaction" }))
            .send()
            .await;
    }

    Json(json!({
        "status": "notifications sent",
        "subscribers": webhooks.len()
    }))
}
