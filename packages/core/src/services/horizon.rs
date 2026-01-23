use reqwest::Client;
use serde::Deserialize;

use crate::errors::HorizonError;

#[derive(Debug, Deserialize)]
pub struct HorizonTransaction {
    pub hash: String,
    pub successful: bool,
    pub fee_charged: String,
}

#[derive(Clone)]
pub struct HorizonClient {
    client: Client,
    base_url: String,
}

impl HorizonClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.into(),
        }
    }

    pub async fn fetch_transaction(
        &self,
        hash: &str,
    ) -> Result<HorizonTransaction, HorizonError> {
        let url = format!("{}/transactions/{}", self.base_url, hash);

        let res = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|_| HorizonError::NetworkError)?;

        match res.status().as_u16() {
            200 => res
                .json::<HorizonTransaction>()
                .await
                .map_err(|_| HorizonError::InvalidResponse),
            404 => Err(HorizonError::TransactionNotFound),
            _ => Err(HorizonError::InvalidResponse),
        }
    }
}
