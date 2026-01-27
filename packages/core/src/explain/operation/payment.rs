use crate::models::fee::FeeStats;
use crate::models::operation::{Asset, PaymentOperation};

#[derive(Debug, PartialEq)]
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

    /// Fee charged for this transaction (stroops)
    pub fee_charged: u64,

    /// Network base fee at time of transaction (stroops)
    pub network_base_fee: u64,

    /// Plain-English explanation of the fee
    pub fee_summary: String,
}

/// Explain a payment operation with fee context
///
/// This function is:
/// - pure
/// - deterministic
/// - side-effect free
pub fn explain_payment_with_fee(
    op: &PaymentOperation,
    fee_charged: u64,
    network_fees: &FeeStats,
) -> PaymentExplanation {
    let asset = match &op.asset {
        Asset::Native => "XLM".to_string(),
        Asset::Credit { code, issuer } => {
            format!("{} ({})", code, issuer)
        }
    };

    let summary = format!(
        "{} sent {} {} to {}",
        op.from,
        op.amount,
        asset,
        op.to
    );

    let fee_summary = if fee_charged <= network_fees.base_fee {
        format!(
            "The transaction used the network base fee of {} stroops.",
            network_fees.base_fee
        )
    } else {
        format!(
            "The transaction paid {} stroops in fees, higher than the base fee of {} due to network conditions.",
            fee_charged,
            network_fees.base_fee
        )
    };

    PaymentExplanation {
        summary,
        from: op.from.clone(),
        to: op.to.clone(),
        asset,
        amount: op.amount.clone(),
        fee_charged,
        network_base_fee: network_fees.base_fee,
        fee_summary,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::fee::FeeStats;
    use crate::models::operation::{Asset, PaymentOperation};

    #[test]
    fn explains_payment_with_base_fee() {
        let op = PaymentOperation {
            from: "GAAAA".to_string(),
            to: "GBBBB".to_string(),
            asset: Asset::Native,
            amount: "10".to_string(),
        };

        let fee_stats = FeeStats {
            base_fee: 100,
            min_fee: 100,
            max_fee: 5000,
            mode_fee: 100,
            p90_fee: 250,
        };

        let explanation =
            explain_payment_with_fee(&op, 100, &fee_stats);

        assert_eq!(
            explanation.fee_summary,
            "The transaction used the network base fee of 100 stroops."
        );
    }

    #[test]
    fn explains_payment_with_higher_than_base_fee() {
        let op = PaymentOperation {
            from: "GAAAA".to_string(),
            to: "GBBBB".to_string(),
            asset: Asset::Native,
            amount: "10".to_string(),
        };

        let fee_stats = FeeStats {
            base_fee: 100,
            min_fee: 100,
            max_fee: 5000,
            mode_fee: 100,
            p90_fee: 250,
        };

        let explanation =
            explain_payment_with_fee(&op, 1000, &fee_stats);

        assert!(
            explanation
                .fee_summary
                .contains("higher than the base fee")
        );
    }

    #[test]
    fn explains_payment_with_credit_asset_and_fee() {
        let op = PaymentOperation {
            from: "GAAAA".to_string(),
            to: "GBBBB".to_string(),
            asset: Asset::Credit {
                code: "USDC".to_string(),
                issuer: "GISSUER".to_string(),
            },
            amount: "50".to_string(),
        };

        let fee_stats = FeeStats {
            base_fee: 100,
            min_fee: 100,
            max_fee: 5000,
            mode_fee: 100,
            p90_fee: 250,
        };

        let explanation =
            explain_payment_with_fee(&op, 250, &fee_stats);

        assert_eq!(
            explanation.summary,
            "GAAAA sent 50 USDC (GISSUER) to GBBBB"
        );
        assert_eq!(explanation.fee_charged, 250);
        assert_eq!(explanation.network_base_fee, 100);
    }
}
