use crate::models::fee::FeeStats;
use crate::models::operation::PaymentOperation;
use crate::services::labels::resolve_label;
use serde::{Deserialize, Serialize};

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

    /// Optional fee context note. Present when fee data was available at explain time.
    /// Example: "Fee paid: 0.0000100 XLM (standard)."
    /// Example: "Fee paid: 0.0010000 XLM (above average — 100x base fee)."
    pub fee_note: Option<String>,
}

/// Explain a payment operation without fee context.
///
/// Use this when fee stats are unavailable. fee_note will be None.
pub fn explain_payment(op: &PaymentOperation) -> PaymentExplanation {
    let asset = format_asset(op);
    let from = op.source_account.clone().unwrap_or_else(|| "Unknown".to_string());
    let to = op.destination.clone();
    let from_display = format_account_for_summary(&from);
    let to_display = format_account_for_summary(&to);

    let summary = format!("{} sent {} {} to {}", from_display, op.amount, asset, to_display);

    PaymentExplanation {
        summary,
        from,
        to,
        asset,
        amount: op.amount.clone(),
        fee_note: None,
    }
}

/// Explain a payment operation with fee context.
///
/// Produces a fee_note that describes whether the fee was standard or elevated.
/// Falls back to the same output as explain_payment() if fee context is trivially zero.
pub fn explain_payment_with_fee(
    op: &PaymentOperation,
    fee_charged: u64,
    network_fees: &FeeStats,
) -> PaymentExplanation {
    let asset = format_asset(op);
    let from = op.source_account.clone().unwrap_or_else(|| "Unknown".to_string());
    let to = op.destination.clone();
    let from_display = format_account_for_summary(&from);
    let to_display = format_account_for_summary(&to);

    let summary = format!("{} sent {} {} to {}", from_display, op.amount, asset, to_display);

    let xlm = FeeStats::stroops_to_xlm(fee_charged);

    let fee_note = if network_fees.is_high_fee(fee_charged) {
        let multiplier = fee_charged / network_fees.base_fee.max(1);
        Some(format!(
            "Fee paid: {} XLM (above average — {}x base fee).",
            xlm, multiplier
        ))
    } else {
        Some(format!("Fee paid: {} XLM (standard).", xlm))
    };

    PaymentExplanation {
        summary,
        from,
        to,
        asset,
        amount: op.amount.clone(),
        fee_note,
    }
}

fn format_asset(op: &PaymentOperation) -> String {
    match op.asset_type.as_str() {
        "native" => "XLM (native)".to_string(),
        _ => {
            if let Some(code) = &op.asset_code {
                if let Some(issuer) = &op.asset_issuer {
                    format!("{} ({})", code, issuer)
                } else {
                    code.clone()
                }
            } else {
                "Unknown".to_string()
            }
        }
    }
}

fn format_account_for_summary(address: &str) -> String {
    if address == "Unknown" {
        return "Unknown".to_string();
    }

    match resolve_label(address) {
        Some(label) => format!("{} ({})", label, address),
        None => address.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::fee::FeeStats;

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

    fn standard_fee_stats() -> FeeStats {
        FeeStats::new(100, 100, 5000, 100, 250)
    }

    #[test]
    fn test_explain_payment_has_no_fee_note() {
        let op = create_test_payment(
            Some("GSENDER".to_string()),
            "GRECIPIENT".to_string(),
            "native".to_string(),
            None,
            None,
            "100.0".to_string(),
        );
        let explanation = explain_payment(&op);
        assert_eq!(explanation.fee_note, None);
    }

    #[test]
    fn test_explain_payment_with_standard_fee() {
        let op = create_test_payment(
            Some("GSENDER".to_string()),
            "GRECIPIENT".to_string(),
            "native".to_string(),
            None,
            None,
            "100.0".to_string(),
        );
        let stats = standard_fee_stats();
        let explanation = explain_payment_with_fee(&op, 100, &stats);

        assert!(explanation.fee_note.is_some());
        let note = explanation.fee_note.unwrap();
        assert!(note.contains("standard"));
        assert!(note.contains("0.0000100"));
    }

    #[test]
    fn test_explain_payment_with_high_fee() {
        let op = create_test_payment(
            Some("GSENDER".to_string()),
            "GRECIPIENT".to_string(),
            "native".to_string(),
            None,
            None,
            "100.0".to_string(),
        );
        let stats = standard_fee_stats();
        // 1000 stroops = 10x base fee (100) — triggers is_high_fee
        let explanation = explain_payment_with_fee(&op, 1000, &stats);

        assert!(explanation.fee_note.is_some());
        let note = explanation.fee_note.unwrap();
        assert!(note.contains("above average"));
        assert!(note.contains("10x"));
    }

    #[test]
    fn test_explain_payment_with_fee_produces_different_output_than_without() {
        let op = create_test_payment(
            Some("GSENDER".to_string()),
            "GRECIPIENT".to_string(),
            "native".to_string(),
            None,
            None,
            "100.0".to_string(),
        );
        let stats = standard_fee_stats();

        let without_fee = explain_payment(&op);
        let with_fee = explain_payment_with_fee(&op, 100, &stats);

        // Core fields are the same
        assert_eq!(without_fee.summary, with_fee.summary);
        assert_eq!(without_fee.from, with_fee.from);
        assert_eq!(without_fee.to, with_fee.to);

        // But fee_note differs
        assert_eq!(without_fee.fee_note, None);
        assert!(with_fee.fee_note.is_some());
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
        assert_eq!(explanation.summary, "GSENDER sent 100.5 XLM (native) to GRECIPIENT");
    }

    #[test]
    fn test_explain_payment_labels_known_addresses_in_summary() {
        let op = create_test_payment(
            Some("GCOINBASEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA".to_string()),
            "GBINANCEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA".to_string(),
            "native".to_string(),
            None,
            None,
            "500".to_string(),
        );

        let explanation = explain_payment(&op);
        assert!(explanation
            .summary
            .contains("Coinbase (GCOINBASEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA)"));
        assert!(explanation
            .summary
            .contains("Binance (GBINANCEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA)"));
    }

    #[test]
    fn test_explain_payment_summary_uses_raw_for_unknown_addresses() {
        let op = create_test_payment(
            Some("GNOTINMAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA".to_string()),
            "GDESTUNKNOWNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA".to_string(),
            "native".to_string(),
            None,
            None,
            "12".to_string(),
        );

        let explanation = explain_payment(&op);
        assert_eq!(
            explanation.summary,
            "GNOTINMAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA sent 12 XLM (native) to GDESTUNKNOWNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
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

    #[test]
    fn test_explain_payment_with_fee_credit_asset() {
        let op = create_test_payment(
            Some("GAAAA".to_string()),
            "GBBBB".to_string(),
            "credit_alphanum4".to_string(),
            Some("USDC".to_string()),
            Some("GISSUER".to_string()),
            "50".to_string(),
        );
        let stats = standard_fee_stats();
        let explanation = explain_payment_with_fee(&op, 250, &stats);

        assert_eq!(explanation.summary, "GAAAA sent 50 USDC (GISSUER) to GBBBB");
        assert!(explanation.fee_note.is_some());
        // 250 stroops — 2.5x base fee, not high (threshold is 5x), should be standard
        assert!(explanation.fee_note.unwrap().contains("standard"));
    }
}
