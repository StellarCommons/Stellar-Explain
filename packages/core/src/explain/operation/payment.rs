//! Payment operation explanation logic.
//!
//! Converts payment operations into human-readable explanations.

use crate::models::operation::PaymentOperation;

/// Explanation of a single payment operation.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct PaymentExplanation {
    pub operation_id: String,
    pub summary: String,
    pub from: Option<String>,
    pub to: String,
    pub asset: String,
    pub amount: String,
}

/// Explains a payment operation in human-readable form.
///
/// This function is pure and deterministic - no IO or external dependencies.
pub fn explain_payment(payment: &PaymentOperation) -> PaymentExplanation {
    let asset = format_asset(&payment.asset_type, &payment.asset_code, &payment.asset_issuer);
    let from = payment.source_account.clone();
    let to = payment.destination.clone();
    let amount = payment.amount.clone();

    let summary = build_summary(&from, &to, &amount, &asset);

    PaymentExplanation {
        operation_id: payment.id.clone(),
        summary,
        from,
        to,
        asset,
        amount,
    }
}

fn format_asset(
    asset_type: &str,
    asset_code: &Option<String>,
    asset_issuer: &Option<String>,
) -> String {
    match asset_type {
        "native" => "XLM".to_string(),
        _ => {
            if let (Some(code), Some(issuer)) = (asset_code, asset_issuer) {
                format!("{} ({}...)", code, &issuer[..8])
            } else {
                "Unknown Asset".to_string()
            }
        }
    }
}

fn build_summary(from: &Option<String>, to: &str, amount: &str, asset: &str) -> String {
    match from {
        Some(source) => {
            format!(
                "{} sent {} {} to {}",
                shorten_address(source),
                amount,
                asset,
                shorten_address(to)
            )
        }
        None => {
            format!("Sent {} {} to {}", amount, asset, shorten_address(to))
        }
    }
}

fn shorten_address(address: &str) -> String {
    if address.len() > 12 {
        format!("{}...{}", &address[..4], &address[address.len() - 4..])
    } else {
        address.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_native_payment() -> PaymentOperation {
        PaymentOperation {
            id: "12345".to_string(),
            source_account: Some("GAIAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX".to_string()),
            destination: "GBDESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX".to_string(),
            asset_type: "native".to_string(),
            asset_code: None,
            asset_issuer: None,
            amount: "100.0".to_string(),
        }
    }

    fn create_custom_asset_payment() -> PaymentOperation {
        PaymentOperation {
            id: "67890".to_string(),
            source_account: None,
            destination: "GBDESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX".to_string(),
            asset_type: "credit_alphanum4".to_string(),
            asset_code: Some("USDC".to_string()),
            asset_issuer: Some("GAISSUERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX".to_string()),
            amount: "50.0".to_string(),
        }
    }

    #[test]
    fn test_explain_native_payment() {
        let payment = create_native_payment();
        let explanation = explain_payment(&payment);

        assert_eq!(explanation.operation_id, "12345");
        assert_eq!(explanation.asset, "XLM");
        assert_eq!(explanation.amount, "100.0");
        assert!(explanation.from.is_some());
        assert!(explanation.summary.contains("sent"));
        assert!(explanation.summary.contains("100.0"));
        assert!(explanation.summary.contains("XLM"));
    }

    #[test]
    fn test_explain_custom_asset_payment() {
        let payment = create_custom_asset_payment();
        let explanation = explain_payment(&payment);

        assert_eq!(explanation.operation_id, "67890");
        assert!(explanation.asset.contains("USDC"));
        assert_eq!(explanation.amount, "50.0");
        assert!(explanation.from.is_none());
        assert!(explanation.summary.contains("Sent"));
        assert!(explanation.summary.contains("50.0"));
    }

    #[test]
    fn test_format_native_asset() {
        let asset = format_asset("native", &None, &None);
        assert_eq!(asset, "XLM");
    }

    #[test]
    fn test_format_custom_asset() {
        let code = Some("USDC".to_string());
        let issuer = Some("GAISSUERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX".to_string());
        let asset = format_asset("credit_alphanum4", &code, &issuer);
        assert!(asset.contains("USDC"));
        assert!(asset.contains("GAISSUER"));
    }

    #[test]
    fn test_shorten_address() {
        let long_addr = "GAIAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
        let short = shorten_address(long_addr);
        assert!(short.starts_with("GAIA"));
        assert!(short.ends_with("XXXX"));
        assert!(short.contains("..."));
    }
}
