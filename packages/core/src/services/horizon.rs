use reqwest::Client;
use serde::Deserialize;

use crate::errors::HorizonError;
use crate::services::transaction_cache::{CacheKey, Network, TransactionCache};

/// Raw transaction response from the Horizon API.
///
/// Captures all fields needed for domain mapping including all 5 memo types.
#[derive(Debug, Deserialize)]
pub struct HorizonTransaction {
    pub hash: String,
    pub successful: bool,
    pub fee_charged: String,

    // Memo fields — all optional since not every transaction has a memo
    // memo_type is always present but can be "none"
    pub memo_type: Option<String>,

    // memo is only present when memo_type is not "none"
    pub memo: Option<String>,
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
            // 5 minute TTL — transactions are immutable once confirmed
            cache: TransactionCache::with_default_ttl(),
        }
    }

    pub async fn fetch_transaction(
        &self,
        hash: &str,
    ) -> Result<HorizonTransaction, HorizonError> {
        let cache_key = CacheKey::new(hash.to_string(), Network::Testnet);

        // Cache hit — return immediately without hitting Horizon
        if let Some(cached) = self.cache.get(&cache_key) {
            return Ok(cached);
        }

        // Cache miss — fetch from Horizon
        let url = format!("{}/transactions/{}", self.base_url, hash);

        let res = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|_| HorizonError::NetworkError)?;

        let tx = match res.status().as_u16() {
            200 => res
                .json::<HorizonTransaction>()
                .await
                .map_err(|_| HorizonError::InvalidResponse)?,
            404 => return Err(HorizonError::TransactionNotFound),
            _ => return Err(HorizonError::InvalidResponse),
        };

        // Store in cache for subsequent requests
        self.cache.insert(cache_key, tx.clone());

        Ok(tx)
    }

    pub async fn fetch_operations(
        &self,
        hash: &str,
    ) -> Result<Vec<HorizonOperation>, HorizonError> {
        let url = format!("{}/transactions/{}/operations", self.base_url, hash);

        let res = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|_| HorizonError::NetworkError)?;

        match res.status().as_u16() {
            200 => {
                let wrapper: HorizonOperationsResponse = res
                    .json()
                    .await
                    .map_err(|_| HorizonError::InvalidResponse)?;
                Ok(wrapper._embedded.records)
            }
            404 => Err(HorizonError::TransactionNotFound),
            _ => Err(HorizonError::InvalidResponse),
        }
    }
}

#[derive(Debug, Deserialize)]
struct HorizonOperationsResponse {
    _embedded: HorizonEmbeddedOperations,
}

#[derive(Debug, Deserialize)]
struct HorizonEmbeddedOperations {
    records: Vec<HorizonOperation>,
}

#[derive(Debug, Deserialize)]
pub struct HorizonOperation {
    pub id: String,
    pub transaction_hash: String,
    #[serde(rename = "type")]
    pub type_i: String,
    pub from: Option<String>,
    pub to: Option<String>,
    pub asset_type: Option<String>,
    pub asset_code: Option<String>,
    pub asset_issuer: Option<String>,
    pub amount: Option<String>,
}