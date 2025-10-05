use reqwest::Client;
use serde::Deserialize;
use serde_json::Value;
use tracing::{info, error};
use crate::errors::AppError;


const HORIZON_URL: &str = "https://horizon.stellar.org";


#[derive(Clone)]
pub struct HorizonClient {
    http: Client,
}

impl HorizonClient {
    
    pub fn new() -> Self {
        Self {
            http: Client::builder()
                .user_agent("stellar-explain/0.1")
                .build()
                .expect("❌ Failed to build HTTP client"),
        }
    }

    
    pub async fn fetch_transaction(&self, hash: &str) -> Result<Value, AppError> {
        let url = format!("{}/transactions/{}", HORIZON_URL, hash);
        info!(%url, "🌐 Fetching transaction from Horizon");

        let resp = self.http
            .get(&url)
            .send()
            .await
            .map_err(|e| {
                error!(?e, "Network request failed");
                AppError::Internal("Network request failed".into())
            })?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            error!(%status, %body, "❌ Horizon API error");
            return Err(AppError::BadRequest(format!(
                "Horizon API error: {}",
                status
            )));
        }

        let json_val = resp.json::<Value>().await.map_err(|e| {
            error!(?e, "Failed to parse JSON");
            AppError::Internal("Failed to parse JSON".into())
        })?;

        Ok(json_val)
    }

    
    pub async fn fetch_account(&self, address: &str) -> Result<Value, AppError> {
        let url = format!("{}/accounts/{}", HORIZON_URL, address);
        info!(%url, "🌐 Fetching account from Horizon");

        let resp = self.http
            .get(&url)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Err(AppError::BadRequest(format!(
                "Account not found: {}",
                address
            )));
        }

        let json_val = resp.json::<Value>().await.map_err(|e| {
            AppError::Internal(format!("Failed to parse account response: {}", e))
        })?;

        Ok(json_val)
    }
}