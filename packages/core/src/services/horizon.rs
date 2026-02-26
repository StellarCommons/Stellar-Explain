use reqwest::Client;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

use crate::errors::HorizonError;
use crate::models::fee::FeeStats;

#[derive(Debug, Deserialize, Clone)]
pub struct HorizonTransaction {
    pub hash: String,
    pub successful: bool,
    pub fee_charged: String,
    pub memo_type: Option<String>,
    pub memo: Option<String>,
    /// ISO 8601 timestamp of ledger close, e.g. "2024-01-15T14:32:00Z"
    pub created_at: Option<String>,
    /// Ledger sequence number in which this transaction was included.
    pub ledger: Option<u64>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct HorizonAccountTransaction {
    pub hash: String,
    pub successful: bool,
    pub created_at: String,
    pub source_account: Option<String>,
    pub operation_count: u32,
    pub memo_type: Option<String>,
    pub memo: Option<String>,
}

#[derive(Clone)]
pub struct HorizonClient {
    client: Client,
    base_url: String,
    /// Simple in-memory cache for stellar.toml lookups keyed by domain.
    toml_cache: Arc<RwLock<HashMap<String, (Option<String>, Instant)>>>,
}

impl HorizonClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.into(),
            toml_cache: Arc::new(RwLock::new(HashMap::new())),
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

    /// Fetch the current network fee stats from Horizon.
    /// Returns None if the request fails — callers degrade gracefully.
    pub async fn fetch_fee_stats(&self) -> Option<FeeStats> {
        let url = format!("{}/fee_stats", self.base_url);

        let res = self.client.get(url).send().await.ok()?;

        if res.status().as_u16() != 200 {
            return None;
        }

        let raw: HorizonFeeStats = res.json().await.ok()?;

        let base_fee = raw.last_ledger_base_fee.parse::<u64>().ok()?;
        let min_fee = raw.fee_charged.min.parse::<u64>().unwrap_or(base_fee);
        let max_fee = raw.fee_charged.max.parse::<u64>().unwrap_or(base_fee);
        let mode_fee = raw.fee_charged.mode.parse::<u64>().unwrap_or(base_fee);
        let p90_fee = raw.fee_charged.p90.parse::<u64>().unwrap_or(base_fee);

        Some(FeeStats::new(base_fee, min_fee, max_fee, mode_fee, p90_fee))
    }

    /// Check whether Horizon is reachable by hitting the root endpoint.
    pub async fn is_reachable(&self) -> bool {
        let url = format!("{}/", self.base_url);
        self.client
            .get(url)
            .timeout(Duration::from_secs(5))
            .send()
            .await
            .map(|r| r.status().as_u16() < 500)
            .unwrap_or(false)
    }

    /// Fetch paginated transactions for an account.
    ///
    /// Returns `(records, next_cursor, prev_cursor)`.
    pub async fn fetch_account_transactions(
        &self,
        address: &str,
        limit: u32,
        cursor: Option<&str>,
        order: &str,
    ) -> Result<(Vec<HorizonAccountTransaction>, Option<String>, Option<String>), HorizonError> {
        let mut url = format!(
            "{}/accounts/{}/transactions?limit={}&order={}",
            self.base_url, address, limit, order
        );
        if let Some(c) = cursor {
            url.push_str(&format!("&cursor={}", c));
        }

        let res = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|_| HorizonError::NetworkError)?;

        match res.status().as_u16() {
            200 => {
                let wrapper: HorizonAccountTransactionsResponse = res
                    .json()
                    .await
                    .map_err(|_| HorizonError::InvalidResponse)?;

                let next_cursor = extract_cursor(
                    wrapper._links.next.as_ref().and_then(|l| l.href.as_deref()),
                );
                let prev_cursor = extract_cursor(
                    wrapper._links.prev.as_ref().and_then(|l| l.href.as_deref()),
                );

                Ok((wrapper._embedded.records, next_cursor, prev_cursor))
            }
            404 => Err(HorizonError::AccountNotFound),
            _ => Err(HorizonError::InvalidResponse),
        }
    }

    /// Fetch ORG_NAME from a domain's stellar.toml.
    /// Results are cached in memory for 10 minutes per domain.
    pub async fn fetch_stellar_toml_org_name(&self, domain: &str) -> Option<String> {
        // Check cache first
        {
            let cache = self.toml_cache.read().unwrap();
            if let Some((cached_value, cached_at)) = cache.get(domain) {
                if cached_at.elapsed() < Duration::from_secs(600) {
                    return cached_value.clone();
                }
            }
        }

        // Fetch from domain
        let url = format!("{}/.well-known/stellar.toml", domain);
        let result = self.client.get(&url).send().await.ok();

        let org_name = if let Some(res) = result {
            if res.status().as_u16() == 200 {
                let body = res.text().await.ok().unwrap_or_default();
                parse_org_name(&body)
            } else {
                None
            }
        } else {
            None
        };

        // Store in cache
        {
            let mut cache = self.toml_cache.write().unwrap();
            cache.insert(domain.to_string(), (org_name.clone(), Instant::now()));
        }

        org_name
    }
}

/// Extract `cursor` query param value from a Horizon pagination href.
fn extract_cursor(href: Option<&str>) -> Option<String> {
    let href = href?;
    let url = reqwest::Url::parse(href).ok()?;
    url.query_pairs()
        .find(|(k, _)| k == "cursor")
        .map(|(_, v)| v.into_owned())
}

/// Parse ORG_NAME from a stellar.toml body.
/// Handles both `ORG_NAME="Foo"` and `ORG_NAME = "Foo"` formats.
fn parse_org_name(toml: &str) -> Option<String> {
    for line in toml.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("ORG_NAME") {
            if let Some(pos) = trimmed.find('=') {
                let value = trimmed[pos + 1..].trim().trim_matches('"').to_string();
                if !value.is_empty() {
                    return Some(value);
                }
            }
        }
    }
    None
}

// ── Horizon JSON shapes ────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct HorizonOperationsResponse {
    _embedded: HorizonEmbeddedOperations,
}

#[derive(Debug, Deserialize)]
struct HorizonEmbeddedOperations {
    records: Vec<HorizonOperation>,
}

#[derive(Debug, Deserialize)]
struct HorizonAccountTransactionsResponse {
    _links: HorizonLinks,
    _embedded: HorizonEmbeddedAccountTransactions,
}

#[derive(Debug, Deserialize)]
struct HorizonLinks {
    next: Option<HorizonLink>,
    prev: Option<HorizonLink>,
}

#[derive(Debug, Deserialize)]
struct HorizonLink {
    href: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HorizonEmbeddedAccountTransactions {
    records: Vec<HorizonAccountTransaction>,
}

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

#[derive(Debug, Deserialize)]
pub struct HorizonOperation {
    pub id: String,
    pub transaction_hash: String,
    #[serde(rename = "type")]
    pub type_i: String,

    // Shared / payment
    pub from: Option<String>,
    pub to: Option<String>,
    pub asset_type: Option<String>,
    pub asset_code: Option<String>,
    pub asset_issuer: Option<String>,
    pub amount: Option<String>,
    pub source_account: Option<String>,

    // set_options
    pub inflation_dest: Option<String>,
    pub clear_flags: Option<u32>,
    pub set_flags: Option<u32>,
    pub master_weight: Option<u32>,
    pub low_threshold: Option<u32>,
    pub med_threshold: Option<u32>,
    pub high_threshold: Option<u32>,
    pub home_domain: Option<String>,
    pub signer_key: Option<String>,
    pub signer_weight: Option<u32>,

    // create_account
    pub funder: Option<String>,
    pub account: Option<String>,
    pub starting_balance: Option<String>,

    // change_trust
    pub limit: Option<String>,

    // manage_offer / manage_buy_offer
    pub selling_asset_type: Option<String>,
    pub selling_asset_code: Option<String>,
    pub selling_asset_issuer: Option<String>,
    pub buying_asset_type: Option<String>,
    pub buying_asset_code: Option<String>,
    pub buying_asset_issuer: Option<String>,
    pub price: Option<String>,
    pub offer_id: Option<u64>,

    // path_payment
    pub source_asset_type: Option<String>,
    pub source_asset_code: Option<String>,
    pub source_asset_issuer: Option<String>,
    pub source_amount: Option<String>,
    pub path: Option<Vec<String>>,

    // clawback_claimable_balance
    pub balance_id: Option<String>,
}