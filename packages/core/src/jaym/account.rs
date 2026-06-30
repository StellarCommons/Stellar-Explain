use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Balance {
    pub asset_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asset_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asset_issuer: Option<String>,
    pub balance: String,
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
}
