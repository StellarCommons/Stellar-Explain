use crate::models::account::Account;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AccountExplanation {
    pub summary: String,
    pub xlm_balance: String,
    pub asset_count: usize,
    pub signer_count: u32,
    pub flag_descriptions: Vec<String>,
}

pub fn explain_account(account: &Account) -> AccountExplanation {
    let xlm_balance = account
        .balances
        .iter()
        .find(|b| b.asset_type == "native")
        .map(|b| b.balance.clone())
        .unwrap_or_else(|| "0".to_string());

    let other_assets: Vec<_> = account
        .balances
        .iter()
        .filter(|b| b.asset_type != "native")
        .collect();

    let asset_count = other_assets.len();

    let home_domain_part = account
        .home_domain
        .as_deref()
        .map(|d| format!(" and home domain {}.", d))
        .unwrap_or_else(|| ".".to_string());

    let summary = if asset_count == 0 {
        format!(
            "This account holds {} XLM. It has {} signer{}{}",
            xlm_balance,
            account.num_signers,
            if account.num_signers == 1 { "" } else { "s" },
            home_domain_part
        )
    } else {
        format!(
            "This account holds {} XLM and {} other asset{}. It has {} signer{}{}",
            xlm_balance,
            asset_count,
            if asset_count == 1 { "" } else { "s" },
            account.num_signers,
            if account.num_signers == 1 { "" } else { "s" },
            home_domain_part
        )
    };

    let mut flag_descriptions = Vec::new();
    if account.flags.auth_required {
        flag_descriptions.push(
            "Auth required: accounts must be authorized before holding this asset.".to_string(),
        );
    }
    if account.flags.auth_revocable {
        flag_descriptions.push(
            "Auth revocable: the issuer can freeze this asset in a holder's account.".to_string(),
        );
    }
    if account.flags.auth_immutable {
        flag_descriptions.push(
            "Auth immutable: account flags and signers can no longer be changed.".to_string(),
        );
    }
    if account.flags.auth_clawback_enabled {
        flag_descriptions.push(
            "Clawback enabled: the issuer can claw back this asset from holders.".to_string(),
        );
    }

    AccountExplanation {
        summary,
        xlm_balance,
        asset_count,
        signer_count: account.num_signers,
        flag_descriptions,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::account::{AccountFlags, Balance};

    fn mock_account(xlm: &str, extra_assets: usize, num_signers: u32, home_domain: Option<&str>) -> Account {
        let mut balances = vec![Balance {
            asset_type: "native".to_string(),
            asset_code: None,
            asset_issuer: None,
            balance: xlm.to_string(),
        }];
        for i in 0..extra_assets {
            balances.push(Balance {
                asset_type: "credit_alphanum4".to_string(),
                asset_code: Some(format!("ASSET{}", i)),
                asset_issuer: Some("GISSUER".to_string()),
                balance: "10.0000000".to_string(),
            });
        }
        Account {
            id: "GTEST".to_string(),
            account_id: "GTEST".to_string(),
            sequence: "1234".to_string(),
            num_signers,
            balances,
            flags: AccountFlags {
                auth_required: false,
                auth_revocable: false,
                auth_immutable: false,
                auth_clawback_enabled: false,
            },
            home_domain: home_domain.map(|s| s.to_string()),
        }
    }

    #[test]
    fn test_summary_no_extra_assets() {
        let account = mock_account("100.5000000", 0, 1, None);
        let explanation = explain_account(&account);
        assert_eq!(explanation.asset_count, 0);
        assert_eq!(explanation.signer_count, 1);
        assert!(explanation.summary.contains("100.5000000 XLM"));
        assert!(!explanation.summary.contains("other asset"));
    }

    #[test]
    fn test_summary_with_extra_assets_and_home_domain() {
        let account = mock_account("104.5000000", 2, 1, Some("stellar.org"));
        let explanation = explain_account(&account);
        assert_eq!(explanation.asset_count, 2);
        assert!(explanation.summary.contains("104.5000000 XLM"));
        assert!(explanation.summary.contains("2 other assets"));
        assert!(explanation.summary.contains("stellar.org"));
    }

    #[test]
    fn test_xlm_balance_extraction() {
        let account = mock_account("50.0000000", 1, 2, None);
        let explanation = explain_account(&account);
        assert_eq!(explanation.xlm_balance, "50.0000000");
    }

    #[test]
    fn test_flag_descriptions() {
        let mut account = mock_account("0.0", 0, 1, None);
        account.flags.auth_required = true;
        account.flags.auth_revocable = true;
        let explanation = explain_account(&account);
        assert_eq!(explanation.flag_descriptions.len(), 2);
        assert!(explanation.flag_descriptions[0].contains("Auth required"));
        assert!(explanation.flag_descriptions[1].contains("Auth revocable"));
    }

    #[test]
    fn test_no_flags() {
        let account = mock_account("0.0", 0, 1, None);
        let explanation = explain_account(&account);
        assert!(explanation.flag_descriptions.is_empty());
    }

    #[test]
    fn test_missing_xlm_balance_defaults_to_zero() {
        let account = Account {
            id: "G1".to_string(),
            account_id: "G1".to_string(),
            sequence: "0".to_string(),
            num_signers: 1,
            balances: vec![],
            flags: AccountFlags {
                auth_required: false,
                auth_revocable: false,
                auth_immutable: false,
                auth_clawback_enabled: false,
            },
            home_domain: None,
        };
        let explanation = explain_account(&account);
        assert_eq!(explanation.xlm_balance, "0");
    }
}
