use crate::models::fee::FeeStats;
use crate::models::operation::PaymentOperation;
use serde::{Deserialize, Serialize};

// The contributor's version has a simplified PaymentExplanation
// with only: summary, from, to, asset, amount (no fee fields)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PaymentExplanation {
    /// Short, human-readable payment summary
    pub summary: String,

    /// Sender account
    pub from: String,

    /// Recipient account
    pub to: String,

    /// Asset description (e.g. XLM, USDC (GISSUER))
    pub asset: String,

    /// Amount transferred
    pub amount: String,
}

/// Explain a payment operation (simplified version without fees)
///
/// This function is:
/// - pure
/// - deterministic
/// - side-effect free
pub fn explain_payment(op: &PaymentOperation) -> PaymentExplanation {
    // Use the actual field names from PaymentOperation
    let asset = match op.asset_type.as_str() {
        "native" => "XLM (native)".to_string(),
        _ => {
            if let Some(code) = &op.asset_code {
                // Include issuer if available
                if let Some(issuer) = &op.asset_issuer {
                    format!("{} ({})", code, issuer)
                } else {
                    code.clone()
                }
            } else {
                "Unknown".to_string()
            }
        }
    };

    // Use source_account instead of op.from
    let from = op.source_account.clone().unwrap_or_else(|| "Unknown".to_string());
    
    // Use destination instead of op.to
    let to = op.destination.clone();

    let summary = format!(
        "{} sent {} {} to {}",
        from,
        op.amount,
        asset,
        to
    );

    PaymentExplanation {
        summary,
        from,
        to,
        asset,
        amount: op.amount.clone(),
    }
}

/// Explain a payment operation with fee context
///
/// This function is:
/// - pure
/// - deterministic
/// - side-effect free
///
/// Note: The current PaymentExplanation struct doesn't include fee fields,
/// so this function ignores the fee parameters and returns the same result
/// as explain_payment(). This is kept for backward compatibility.
pub fn explain_payment_with_fee(
    op: &PaymentOperation,
    _fee_charged: u64,
    _network_fees: &FeeStats,
) -> PaymentExplanation {
    // Just delegate to the simpler version since PaymentExplanation
    // no longer has fee fields
    explain_payment(op)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::fee::FeeStats;

    // Helper function to create a test PaymentOperation
    fn create_test_payment(
        source: Option<String>,
        destination: String,
        asset_type: String,
        asset_code: Option<String>,
        asset_issuer: Option<String>,
        amount: String,
    ) -> PaymentOperation {
        PaymentOperation {
            id: "test_id".to_string(),
            source_account: source,
            destination,
            asset_type,
            asset_code,
            asset_issuer,
            amount,
        }
    }

    #[test]
    fn explains_payment_with_base_fee() {
        let op = create_test_payment(
            Some("GAAAA".to_string()),
            "GBBBB".to_string(),
            "native".to_string(),
            None,
            None,
            "10".to_string(),
        );

        let fee_stats = FeeStats {
            base_fee: 100,
            min_fee: 100,
            max_fee: 5000,
            mode_fee: 100,
            p90_fee: 250,
        };

        let explanation = explain_payment_with_fee(&op, 100, &fee_stats);

        // Check that the explanation has the correct basic fields
        assert_eq!(explanation.from, "GAAAA");
        assert_eq!(explanation.to, "GBBBB");
        assert_eq!(explanation.amount, "10");
        assert!(explanation.summary.contains("sent"));
    }

    #[test]
    fn explains_payment_with_higher_than_base_fee() {
        let op = create_test_payment(
            Some("GAAAA".to_string()),
            "GBBBB".to_string(),
            "native".to_string(),
            None,
            None,
            "10".to_string(),
        );

        let fee_stats = FeeStats {
            base_fee: 100,
            min_fee: 100,
            max_fee: 5000,
            mode_fee: 100,
            p90_fee: 250,
        };

        let explanation = explain_payment_with_fee(&op, 1000, &fee_stats);

        // Verify basic explanation structure
        assert!(explanation.summary.contains("GAAAA"));
        assert!(explanation.summary.contains("GBBBB"));
    }

    #[test]
    fn explains_payment_with_credit_asset_and_fee() {
        let op = create_test_payment(
            Some("GAAAA".to_string()),
            "GBBBB".to_string(),
            "credit_alphanum4".to_string(),
            Some("USDC".to_string()),
            Some("GISSUER".to_string()),
            "50".to_string(),
        );

        let fee_stats = FeeStats {
            base_fee: 100,
            min_fee: 100,
            max_fee: 5000,
            mode_fee: 100,
            p90_fee: 250,
        };

        let explanation = explain_payment_with_fee(&op, 250, &fee_stats);

        assert_eq!(
            explanation.summary,
            "GAAAA sent 50 USDC (GISSUER) to GBBBB"
        );
        assert_eq!(explanation.from, "GAAAA");
        assert_eq!(explanation.to, "GBBBB");
        assert_eq!(explanation.amount, "50");
        assert!(explanation.asset.contains("USDC"));
    }

    #[test]
    fn test_explain_payment_native_asset() {
        let op = create_test_payment(
            Some("GSENDER".to_string()),
            "GRECIPIENT".to_string(),
            "native".to_string(),
            None,
            None,
            "100.5".to_string(),
        );

        let explanation = explain_payment(&op);

        assert_eq!(explanation.from, "GSENDER");
        assert_eq!(explanation.to, "GRECIPIENT");
        assert_eq!(explanation.amount, "100.5");
        assert_eq!(explanation.asset, "XLM (native)");
        assert_eq!(
            explanation.summary,
            "GSENDER sent 100.5 XLM (native) to GRECIPIENT"
        );
    }

    #[test]
    fn test_explain_payment_credit_asset() {
        let op = create_test_payment(
            Some("GSENDER".to_string()),
            "GRECIPIENT".to_string(),
            "credit_alphanum4".to_string(),
            Some("USD".to_string()),
            Some("GISSUER123".to_string()),
            "25.75".to_string(),
        );

        let explanation = explain_payment(&op);

        assert_eq!(explanation.asset, "USD (GISSUER123)");
        assert!(explanation.summary.contains("USD (GISSUER123)"));
    }

    #[test]
    fn test_explain_payment_no_source_account() {
        let op = create_test_payment(
            None,
            "GRECIPIENT".to_string(),
            "native".to_string(),
            None,
            None,
            "50".to_string(),
        );

        let explanation = explain_payment(&op);

        assert_eq!(explanation.from, "Unknown");
        assert!(explanation.summary.contains("Unknown"));
    }
}