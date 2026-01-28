use serde::{Deserialize, Serialize};

use crate::models::operation::PaymentOperation;

#[derive(Debug, PartialEq, Serialize, Deserialize, Clone)]
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

pub fn explain_payment(op: &PaymentOperation) -> PaymentExplanation {
    let asset_display = if op.asset_type == "native" {
        "XLM".to_string()
    } else {
        match (&op.asset_code, &op.asset_issuer) {
            (Some(code), Some(issuer)) => format!("{} ({})", code, issuer),
            (Some(code), None) => code.clone(),
            _ => "Unknown Asset".to_string(),
        }
    };

    let from_account = op.source_account.clone().unwrap_or_else(|| "Source".to_string());

    let summary = format!(
        "{} sent {} {} to {}",
        from_account,
        op.amount,
        asset_display,
        op.destination
    );

    PaymentExplanation {
        summary,
        from: from_account,
        to: op.destination.clone(),
        asset: asset_display,
        amount: op.amount.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn explains_native_payment() {
        let op = PaymentOperation {
            id: "1".to_string(),
            source_account: Some("GAAAA".to_string()),
            destination: "GBBBB".to_string(),
            asset_type: "native".to_string(),
            asset_code: None,
            asset_issuer: None,
            amount: "10".to_string(),
        };

        let explanation = explain_payment(&op);

        assert_eq!(explanation.summary, "GAAAA sent 10 XLM to GBBBB");
        assert_eq!(explanation.asset, "XLM");
    }

    #[test]
    fn explains_credit_payment() {
        let op = PaymentOperation {
            id: "2".to_string(),
            source_account: Some("GAAAA".to_string()),
            destination: "GBBBB".to_string(),
            asset_type: "credit_alphanum4".to_string(),
            asset_code: Some("USDC".to_string()),
            asset_issuer: Some("GISSUER".to_string()),
            amount: "50".to_string(),
        };

        let explanation = explain_payment(&op);

        assert_eq!(explanation.asset, "USDC (GISSUER)");
    }
}
