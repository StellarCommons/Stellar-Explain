use crate::models::operation::CreateAccountOperation;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CreateAccountExplanation {
    /// Short, human-readable summary of the account creation.
    pub summary: String,

    /// The account that funded the new account.
    pub funder: String,

    /// The newly created account address.
    pub new_account: String,

    /// The starting balance sent to activate the new account (in XLM).
    pub starting_balance: String,
}

/// Explain a create_account operation.
///
/// create_account funds and activates a brand-new Stellar account.
/// The funder sends a starting balance (in XLM) which covers the base reserve
/// and makes the account usable on the network.
pub fn explain_create_account(op: &CreateAccountOperation) -> CreateAccountExplanation {
    let summary = format!(
        "{} created account {} with a starting balance of {} XLM.",
        op.funder, op.new_account, op.starting_balance
    );

    CreateAccountExplanation {
        summary,
        funder: op.funder.clone(),
        new_account: op.new_account.clone(),
        starting_balance: op.starting_balance.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_create_account(funder: &str, new_account: &str, starting_balance: &str) -> CreateAccountOperation {
        CreateAccountOperation {
            id: "test_op_id".to_string(),
            funder: funder.to_string(),
            new_account: new_account.to_string(),
            starting_balance: starting_balance.to_string(),
        }
    }

    #[test]
    fn test_explain_create_account_standard() {
        let op = make_create_account("GAAAA", "GBBBB", "100");
        let explanation = explain_create_account(&op);

        assert_eq!(explanation.funder, "GAAAA");
        assert_eq!(explanation.new_account, "GBBBB");
        assert_eq!(explanation.starting_balance, "100");
        assert!(explanation.summary.contains("GAAAA"));
        assert!(explanation.summary.contains("GBBBB"));
        assert!(explanation.summary.contains("100"));
        assert!(explanation.summary.contains("XLM"));
    }

    #[test]
    fn test_explain_create_account_summary_format() {
        let op = make_create_account("GFUNDER", "GNEWACCT", "1.5");
        let explanation = explain_create_account(&op);
        assert_eq!(
            explanation.summary,
            "GFUNDER created account GNEWACCT with a starting balance of 1.5 XLM."
        );
    }

    #[test]
    fn test_explain_create_account_fields_are_preserved() {
        let op = make_create_account("GSOURCE", "GDESTINATION", "200.5");
        let explanation = explain_create_account(&op);
        assert_eq!(explanation.funder, "GSOURCE");
        assert_eq!(explanation.new_account, "GDESTINATION");
        assert_eq!(explanation.starting_balance, "200.5");
    }

    #[test]
    fn test_explain_create_account_minimum_reserve() {
        // 1 XLM is the minimum starting balance on Stellar mainnet
        let op = make_create_account("GAAAA", "GBBBB", "1");
        let explanation = explain_create_account(&op);
        assert!(explanation.summary.contains("1"));
        assert!(explanation.summary.contains("XLM"));
    }

    #[test]
    fn test_explain_create_account_default_balance_fallback() {
        // When starting_balance is missing from Horizon, From mapping defaults to "0"
        let op = make_create_account("GAAAA", "GBBBB", "0");
        let explanation = explain_create_account(&op);
        assert_eq!(explanation.starting_balance, "0");
        assert!(explanation.summary.contains("0"));
    }
}
