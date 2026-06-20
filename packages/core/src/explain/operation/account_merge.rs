use crate::models::operation::AccountMergeOperation;
use serde::{Deserialize, Serialize};

/// Human-readable explanation of an account_merge operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AccountMergeExplanation {
    /// Full natural-language summary of the merge.
    pub summary: String,

    /// The account that was merged away (and no longer exists on-chain).
    pub source: String,

    /// The account that received the remaining XLM balance.
    pub destination: String,
}

/// Explain an account_merge operation.
///
/// The source account is removed from the ledger and any remaining XLM
/// it held is transferred in full to the destination account.
pub fn explain_account_merge(op: &AccountMergeOperation) -> AccountMergeExplanation {
    let summary = format!(
        "{} merged their account into {}, transferring all remaining XLM",
        op.source, op.destination
    );

    AccountMergeExplanation {
        summary,
        source: op.source.clone(),
        destination: op.destination.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_account_merge(source: &str, destination: &str) -> AccountMergeOperation {
        AccountMergeOperation {
            id: "test_op_id".to_string(),
            source: source.to_string(),
            destination: destination.to_string(),
        }
    }

    #[test]
    fn test_explain_account_merge_summary_format() {
        let op = make_account_merge("GAAAA", "GBBBB");
        let explanation = explain_account_merge(&op);
        assert_eq!(
            explanation.summary,
            "GAAAA merged their account into GBBBB, transferring all remaining XLM"
        );
    }

    #[test]
    fn test_explain_account_merge_fields_preserved() {
        let op = make_account_merge("GSOURCE123", "GDEST456");
        let explanation = explain_account_merge(&op);
        assert_eq!(explanation.source, "GSOURCE123");
        assert_eq!(explanation.destination, "GDEST456");
    }

    #[test]
    fn test_explain_account_merge_summary_contains_both_accounts() {
        let op = make_account_merge("GMERGEDFROM", "GMERGEDINTO");
        let explanation = explain_account_merge(&op);
        assert!(explanation.summary.contains("GMERGEDFROM"));
        assert!(explanation.summary.contains("GMERGEDINTO"));
    }

    #[test]
    fn test_explain_account_merge_mentions_transfer() {
        let op = make_account_merge("GAAAA", "GBBBB");
        let explanation = explain_account_merge(&op);
        assert!(explanation.summary.contains("transferring all remaining XLM"));
    }

    #[test]
    fn test_explain_account_merge_unknown_source() {
        let op = make_account_merge("Unknown", "GBBBB");
        let explanation = explain_account_merge(&op);
        assert_eq!(explanation.source, "Unknown");
        assert!(explanation.summary.starts_with("Unknown merged"));
    }
}