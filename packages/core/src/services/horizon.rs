use reqwest::Client;
use serde::Deserialize;

use crate::errors::HorizonError;
use crate::models::fee::FeeStats;
use crate::services::transaction_cache::{CacheKey, Network, TransactionCache};

/// Raw transaction response from the Horizon API.
#[derive(Debug, Deserialize, Clone)]
pub struct HorizonTransaction {
    pub hash: String,
    pub successful: bool,
    pub fee_charged: String,
    pub memo_type: Option<String>,
    pub memo: Option<String>,
}

/// Raw fee_stats response from Horizon.
/// https://developers.stellar.org/api/horizon/aggregations/fee-stats
#[derive(Debug, Deserialize)]
struct HorizonFeeStats {
    last_ledger_base_fee: String,
    fee_charged: HorizonFeeCharged,
}

#[derive(Debug, Deserialize)]
struct HorizonFeeCharged {
    min: String,
    max: String,
    mode: String,
    p90: String,
}

#[derive(Clone)]
pub struct HorizonClient {
    client: Client,
    base_url: String,
    cache: TransactionCache<HorizonTransaction>,
}

impl HorizonClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.into(),
            cache: TransactionCache::with_default_ttl(),
        }
    }

    pub async fn fetch_transaction(
        &self,
        hash: &str,
    ) -> Result<HorizonTransaction, HorizonError> {
        let cache_key = CacheKey::new(hash.to_string(), Network::Testnet);

        if let Some(cached) = self.cache.get(&cache_key) {
            return Ok(cached);
        }

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

    /// Fetch current network fee statistics from Horizon.
    /// Returns None if the request fails — callers should degrade gracefully.
    pub async fn fetch_fee_stats(&self) -> Option<FeeStats> {
        let url = format!("{}/fee_stats", self.base_url);

        let res = self.client.get(url).send().await.ok()?;

        if res.status().as_u16() != 200 {
            return None;
        }

        let raw: HorizonFeeStats = res.json().await.ok()?;

        // Horizon returns fees as string stroops — parse each field
        let base_fee = raw.last_ledger_base_fee.parse::<u64>().ok()?;
        let min_fee = raw.fee_charged.min.parse::<u64>().ok()?;
        let max_fee = raw.fee_charged.max.parse::<u64>().ok()?;
        let mode_fee = raw.fee_charged.mode.parse::<u64>().ok()?;
        let p90_fee = raw.fee_charged.p90.parse::<u64>().ok()?;

        Some(FeeStats {
            base_fee,
            min_fee,
            max_fee,
            mode_fee,
            p90_fee,
        })
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

#[derive(Debug, Deserialize, Clone)]
pub struct HorizonPathAsset {
    #[serde(rename = "asset_type")]
    pub asset_type: String,
    pub asset_code: Option<String>,
    pub asset_issuer: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct HorizonOperation {
    pub id: String,
    pub transaction_hash: String,
    #[serde(rename = "type")]
    pub type_i: String,
    pub source_account: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub asset_type: Option<String>,
    pub asset_code: Option<String>,
    pub asset_issuer: Option<String>,
    pub amount: Option<String>,
    pub selling_asset_type: Option<String>,
    pub selling_asset_code: Option<String>,
    pub selling_asset_issuer: Option<String>,
    pub buying_asset_type: Option<String>,
    pub buying_asset_code: Option<String>,
    pub buying_asset_issuer: Option<String>,
    pub price: Option<String>,
    pub offer_id: Option<u64>,
    pub source_asset_type: Option<String>,
    pub source_asset_code: Option<String>,
    pub source_asset_issuer: Option<String>,
    pub source_amount: Option<String>,
    pub path: Option<Vec<HorizonPathAsset>>,
    pub trustor: Option<String>,
    pub limit: Option<String>,
    pub funder: Option<String>,
    pub account: Option<String>,
    pub starting_balance: Option<String>,
}