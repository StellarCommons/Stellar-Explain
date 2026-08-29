use reqwest::Client;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

use crate::errors::HorizonError;
use crate::models::account::{Account, AccountFlags, Balance};
use crate::models::fee::FeeStats;

// ── Horizon response structs ───────────────────────────────────────────────

/// Result codes returned by Horizon for a failed transaction.
/// Present either directly on the transaction or under `extras`.
#[derive(Debug, Deserialize, Clone)]
pub struct HorizonResultCodes {
    pub transaction: Option<String>,
    #[serde(default)]
    pub operations: Vec<String>,
}

/// The `extras` envelope that Horizon includes in error responses.
#[derive(Debug, Deserialize, Clone)]
pub struct HorizonExtras {
    pub result_codes: Option<HorizonResultCodes>,
}

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
    /// Result codes present on fetched failed transactions.
    pub result_codes: Option<HorizonResultCodes>,
    /// Result codes nested under `extras` in Horizon submission error responses.
    pub extras: Option<HorizonExtras>,
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
    /// Ledger sequence number this transaction was included in.
    pub ledger: Option<u64>,
    /// Fee charged in stroops (as a decimal string from Horizon).
    pub fee_charged: Option<String>,
}

/// Raw Horizon account response shape.
/// Horizon returns `signers` as an array and `flags` as a nested object,
/// so we deserialize here then convert to the domain Account model.
#[derive(Debug, Deserialize)]
struct HorizonAccount {
    pub id: String,
    pub account_id: String,
    pub sequence: String,
    pub balances: Vec<HorizonBalance>,
    pub signers: Vec<HorizonSigner>,
    pub flags: HorizonAccountFlags,
    /// Horizon sends "" when not set, never null or absent
    #[serde(default)]
    pub home_domain: String,
    /// Number of subentries (offers, trustlines, signers, etc.)
    #[serde(default)]
    pub subentry_count: u32,
    /// Number of entries sponsored by other accounts
    #[serde(default)]
    pub num_sponsoring: u32,
    /// Number of entries this account sponsors for others
    #[serde(default)]
    pub num_sponsored: u32,
}

#[derive(Debug, Deserialize)]
struct HorizonBalance {
    pub asset_type: String,
    #[serde(default)]
    pub asset_code: Option<String>,
    #[serde(default)]
    pub asset_issuer: Option<String>,
    pub balance: String,
    /// Whether this trustline is authorised by the asset issuer.
    #[serde(default)]
    pub is_authorized: bool,
}

#[derive(Debug, Deserialize)]
struct HorizonSigner {
    #[serde(default)]
    pub weight: u32,
}

#[derive(Debug, Deserialize, Default)]
struct HorizonAccountFlags {
    #[serde(default)]
    pub auth_required: bool,
    #[serde(default)]
    pub auth_revocable: bool,
    #[serde(default)]
    pub auth_immutable: bool,
    #[serde(default)]
    pub auth_clawback_enabled: bool,
}

impl HorizonAccount {
    fn into_domain(self) -> Account {
        let balances = self
            .balances
            .into_iter()
            .map(|b| Balance {
                asset_type: b.asset_type,
                asset_code: b.asset_code,
                asset_issuer: b.asset_issuer,
                balance: b.balance,
                is_authorized: b.is_authorized,
            })
            .collect();

        // Count signers with weight > 0 (weight 0 = revoked/removed)
        let num_signers = self.signers.iter().filter(|s| s.weight > 0).count() as u32;

        Account {
            id: self.id,
            account_id: self.account_id,
            sequence: self.sequence,
            num_signers,
            balances,
            flags: AccountFlags {
                auth_required: self.flags.auth_required,
                auth_revocable: self.flags.auth_revocable,
                auth_immutable: self.flags.auth_immutable,
                auth_clawback_enabled: self.flags.auth_clawback_enabled,
            },
            home_domain: if self.home_domain.is_empty() {
                None
            } else {
                Some(self.home_domain)
            },
            subentry_count: self.subentry_count,
            num_sponsoring: self.num_sponsoring,
            num_sponsored: self.num_sponsored,
        }
    }
}

// ── HorizonClient ──────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct HorizonClient {
    client: Client,
    base_url: String,
    #[allow(clippy::type_complexity)]
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

    pub async fn fetch_transaction(&self, hash: &str) -> Result<HorizonTransaction, HorizonError> {
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

    /// Fetch a Stellar account by address.
    /// Deserializes via HorizonAccount (matching Horizon's actual response shape)
    /// then converts to the domain Account model.
    pub async fn fetch_account(&self, address: &str) -> Result<Account, HorizonError> {
        let url = format!("{}/accounts/{}", self.base_url, address);

        let res = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|_| HorizonError::NetworkError)?;

        match res.status().as_u16() {
            200 => {
                let raw: HorizonAccount = res
                    .json()
                    .await
                    .map_err(|_| HorizonError::InvalidResponse)?;
                Ok(raw.into_domain())
            }
            404 => Err(HorizonError::AccountNotFound),
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

    /// Fetch the base reserve in stroops from the most recent ledger.
    /// Returns `None` if the request fails — callers degrade gracefully,
    /// consistent with `fetch_fee_stats`'s pattern.
    pub async fn fetch_ledger_base_reserve(&self) -> Option<u64> {
        let url = format!("{}/ledgers?order=desc&limit=1", self.base_url);
        let res = self.client.get(url).send().await.ok()?;
        if res.status().as_u16() != 200 {
            return None;
        }
        let wrapper: HorizonLedgersResponse = res.json().await.ok()?;
        let ledger = wrapper._embedded.records.first()?;
        ledger.base_reserve_in_stroops.parse::<u64>().ok()
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
    /// Returns `(records, next_cursor, prev_cursor)`.
    pub async fn fetch_account_transactions(
        &self,
        address: &str,
        limit: u32,
        cursor: Option<&str>,
        order: &str,
    ) -> Result<
        (
            Vec<HorizonAccountTransaction>,
            Option<String>,
            Option<String>,
        ),
        HorizonError,
    > {
        let mut url = format!(
            "{}/accounts/{}/transactions?limit={}&order={}",
            self.base_url, address, limit, order
        );
        if let Some(c) = cursor {
            url.push_str(&format!("&cursor={c}"));
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

                let next_cursor =
                    extract_cursor(wrapper._links.next.as_ref().and_then(|l| l.href.as_deref()));
                let prev_cursor =
                    extract_cursor(wrapper._links.prev.as_ref().and_then(|l| l.href.as_deref()));

                Ok((wrapper._embedded.records, next_cursor, prev_cursor))
            }
            404 => Err(HorizonError::AccountNotFound),
            _ => Err(HorizonError::InvalidResponse),
        }
    }

    /// Fetch the ORG_NAME from a domain's stellar.toml file.
    /// Returns None if the file is missing, unreachable, or doesn't contain ORG_NAME.
    pub async fn fetch_stellar_toml_org_name(&self, domain: &str) -> Option<String> {
        // Check cache first
        {
            let cache = self.toml_cache.read().ok()?;
            if let Some((cached, fetched_at)) = cache.get(domain)
                && fetched_at.elapsed() < Duration::from_secs(3600)
            {
                return cached.clone();
            }
        }

        let toml_url = format!("{domain}/.well-known/stellar.toml");
        let res = self
            .client
            .get(&toml_url)
            .timeout(Duration::from_secs(5))
            .send()
            .await
            .ok()?;

        if res.status().as_u16() != 200 {
            return None;
        }

        let text = res.text().await.ok()?;
        let org_name = parse_org_name(&text);

        // Store in cache
        if let Ok(mut cache) = self.toml_cache.write() {
            cache.insert(domain.to_string(), (org_name.clone(), Instant::now()));
        }

        org_name
    }
}

// ── Supporting structs ─────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct HorizonOperation {
    pub id: String,
    pub transaction_hash: String,
    #[serde(rename = "type")]
    pub operation_type: String,
    pub source_account: Option<String>,
    // Payment fields
    pub amount: Option<String>,
    pub asset_type: Option<String>,
    pub asset_code: Option<String>,
    pub asset_issuer: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    // Create account fields
    pub starting_balance: Option<String>,
    pub funder: Option<String>,
    pub account: Option<String>,
    // Change trust fields
    pub limit: Option<String>,
    pub trustee: Option<String>,
    pub trustor: Option<String>,
    pub asset_code_change_trust: Option<String>,
    // Manage offer fields
    pub offer_id: Option<String>,
    pub buying_asset_type: Option<String>,
    pub buying_asset_code: Option<String>,
    pub buying_asset_issuer: Option<String>,
    pub selling_asset_type: Option<String>,
    pub selling_asset_code: Option<String>,
    pub selling_asset_issuer: Option<String>,
    pub price: Option<String>,
    // Set options fields
    pub set_flags: Option<Vec<u32>>,
    pub clear_flags: Option<Vec<u32>>,
    pub master_key_weight: Option<u32>,
    pub low_threshold: Option<u32>,
    pub med_threshold: Option<u32>,
    pub high_threshold: Option<u32>,
    pub home_domain: Option<String>,
    pub signer_key: Option<String>,
    pub signer_weight: Option<u32>,
    pub inflation_dest: Option<String>,
    // Path payment fields
    pub source_amount: Option<String>,
    pub source_asset_type: Option<String>,
    pub source_asset_code: Option<String>,
    pub source_asset_issuer: Option<String>,
    // Clawback fields
    pub balance_id: Option<String>,
    // Account merge fields
    pub into: Option<String>,
    // Create claimable balance fields
    pub asset: Option<String>,
    pub claimants: Option<Vec<HorizonClaimant>>,
    // Claim claimable balance fields
    pub claimant: Option<String>,
    // Sponsorship fields
    pub sponsored_id: Option<String>,
    pub begin_sponsor: Option<String>,
}

/// A claimant within a `create_claimable_balance` Horizon response.
#[derive(Debug, Deserialize, Clone)]
pub struct HorizonClaimant {
    pub destination: String,
    /// Nested predicate object — handled as generic JSON since structure is recursive.
    pub predicate: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct HorizonOperationsResponse {
    _embedded: HorizonEmbeddedOperations,
}

#[derive(Debug, Deserialize)]
struct HorizonEmbeddedOperations {
    records: Vec<HorizonOperation>,
}

#[derive(Deserialize)]
struct HorizonFeeStats {
    last_ledger_base_fee: String,
    fee_charged: HorizonFeeDistribution,
}

#[derive(Deserialize)]
struct HorizonFeeDistribution {
    min: String,
    max: String,
    mode: String,
    p90: String,
}

#[derive(Debug, Deserialize)]
struct HorizonLedgersResponse {
    _embedded: HorizonEmbeddedLedgers,
}

#[derive(Debug, Deserialize)]
struct HorizonEmbeddedLedgers {
    records: Vec<HorizonLedger>,
}

#[derive(Debug, Deserialize)]
struct HorizonLedger {
    base_reserve_in_stroops: String,
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
struct HorizonAccountTransactionsResponse {
    _links: HorizonLinks,
    _embedded: HorizonEmbeddedAccountTransactions,
}

#[derive(Debug, Deserialize)]
struct HorizonEmbeddedAccountTransactions {
    records: Vec<HorizonAccountTransaction>,
}

fn extract_cursor(href: Option<&str>) -> Option<String> {
    let href = href?;
    let cursor_param = href.split(['?', '&']).find(|p| p.starts_with("cursor="))?;
    Some(cursor_param.trim_start_matches("cursor=").to_string())
}

fn parse_org_name(toml: &str) -> Option<String> {
    for line in toml.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("ORG_NAME")
            && let Some(eq_pos) = trimmed.find('=')
        {
            let value = trimmed[eq_pos + 1..].trim().trim_matches('"').to_string();
            if !value.is_empty() {
                return Some(value);
            }
        }
    }
    None
}
