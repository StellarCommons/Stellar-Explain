use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Balance {
    pub asset_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asset_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asset_issuer: Option<String>,
    pub balance: String,
    /// Whether this trustline is authorised by the asset issuer.
    /// Only meaningful when the issuer has `auth_required` set.
    #[serde(default)]
    pub is_authorized: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccountFlags {
    pub auth_required: bool,
    pub auth_revocable: bool,
    pub auth_immutable: bool,
    pub auth_clawback_enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: String,
    pub account_id: String,
    pub sequence: String,
    pub num_signers: u32,
    pub balances: Vec<Balance>,
    pub flags: AccountFlags,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub home_domain: Option<String>,
    /// Number of subentries (offers, trustlines, signers, etc.).
    /// Each subentry adds 0.5 XLM to the minimum reserve.
    #[serde(default)]
    pub subentry_count: u32,
    /// Number of entries sponsored by other accounts.
    #[serde(default)]
    pub num_sponsoring: u32,
    /// Number of entries this account sponsors for others.
    #[serde(default)]
    pub num_sponsored: u32,
}
