use crate::models::operation::ChangeTrustOperation;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ChangeTrustExplanation {
    /// Short, human-readable summary of the trust operation.
    pub summary: String,

    /// The account opting in or out of holding the asset.
    pub trustor: String,

    /// The asset code (e.g. "USDC").
    pub asset_code: String,

    /// The asset issuer account.
    pub asset_issuer: String,

    /// The trust limit. "0" indicates trust removal.
    pub limit: String,

    /// True when the operation removes an existing trust line.
    pub is_removal: bool,
}

/// Explain a change_trust operation.
///
/// A limit of "0" means the account is removing an existing trust line.
/// Any other limit means the account is adding or updating a trust line.
pub fn explain_change_trust(op: &ChangeTrustOperation) -> ChangeTrustExplanation {
    let is_removal = op.limit == "0";

    let summary = if is_removal {
        format!("{} removed trust for {}.", op.trustor, op.asset_code)
    } else {
        format!(
            "{} opted in to hold up to {} {} issued by {}.",
            op.trustor, op.limit, op.asset_code, op.asset_issuer
        )
    };

    ChangeTrustExplanation {
        summary,
        trustor: op.trustor.clone(),
        asset_code: op.asset_code.clone(),
        asset_issuer: op.asset_issuer.clone(),
        limit: op.limit.clone(),
        is_removal,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_change_trust(trustor: &str, asset_code: &str, asset_issuer: &str, limit: &str) -> ChangeTrustOperation {
        ChangeTrustOperation {
            id: "test_op_id".to_string(),
            trustor: trustor.to_string(),
            asset_code: asset_code.to_string(),
            asset_issuer: asset_issuer.to_string(),
            limit: limit.to_string(),
        }
    }

    #[test]
    fn test_explain_change_trust_adds_trust() {
        let op = make_change_trust(
            "GAAAA",
            "USDC",
            "GBBB",
            "10000",
        );
        let explanation = explain_change_trust(&op);

        assert!(!explanation.is_removal);
        assert_eq!(explanation.trustor, "GAAAA");
        assert_eq!(explanation.asset_code, "USDC");
        assert_eq!(explanation.asset_issuer, "GBBB");
        assert_eq!(explanation.limit, "10000");
        assert!(explanation.summary.contains("GAAAA"));
        assert!(explanation.summary.contains("opted in"));
        assert!(explanation.summary.contains("10000"));
        assert!(explanation.summary.contains("USDC"));
        assert!(explanation.summary.contains("GBBB"));
    }

    #[test]
    fn test_explain_change_trust_removes_trust() {
        let op = make_change_trust(
            "GAAAA",
            "USDC",
            "GBBB",
            "0",
        );
        let explanation = explain_change_trust(&op);

        assert!(explanation.is_removal);
        assert_eq!(explanation.trustor, "GAAAA");
        assert_eq!(explanation.asset_code, "USDC");
        assert_eq!(explanation.limit, "0");
        assert!(explanation.summary.contains("GAAAA"));
        assert!(explanation.summary.contains("removed trust"));
        assert!(explanation.summary.contains("USDC"));
    }

    #[test]
    fn test_explain_change_trust_removal_summary_format() {
        let op = make_change_trust("GAAAA", "BTC", "GISSUER", "0");
        let explanation = explain_change_trust(&op);
        assert_eq!(explanation.summary, "GAAAA removed trust for BTC.");
    }

    #[test]
    fn test_explain_change_trust_add_summary_format() {
        let op = make_change_trust("GAAAA", "USDC", "GBBB", "10000");
        let explanation = explain_change_trust(&op);
        assert_eq!(
            explanation.summary,
            "GAAAA opted in to hold up to 10000 USDC issued by GBBB."
        );
    }

    #[test]
    fn test_explain_change_trust_nonzero_limit_is_not_removal() {
        let op = make_change_trust("GAAAA", "USDC", "GBBB", "1");
        let explanation = explain_change_trust(&op);
        assert!(!explanation.is_removal);
    }
}
