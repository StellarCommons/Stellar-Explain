use crate::models::operation::{PathPaymentOperation, PathPaymentType};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PathPaymentExplanation {
    pub summary: String,
    pub sender: String,
    pub destination: String,
    pub send_asset: String,
    pub send_amount: String,
    pub dest_asset: String,
    pub dest_amount: String,
    pub path_description: Option<String>,
    pub payment_type: String,
}

pub fn explain_path_payment(op: &PathPaymentOperation) -> PathPaymentExplanation {
    let sender = op.source_account.clone().unwrap_or_else(|| "Unknown".to_string());

    let path_description = if op.path.is_empty() {
        None
    } else {
        let n = op.path.len();
        Some(format!("via {} intermediate asset{}", n, if n == 1 { "" } else { "s" }))
    };

    let conversion = if op.send_asset == op.dest_asset {
        format!(
            "{} sent {} {} to {}",
            sender, op.send_amount, op.send_asset, op.destination
        )
    } else {
        format!(
            "{} sent {} {} which was converted to {} {} received by {}",
            sender, op.send_amount, op.send_asset, op.dest_amount, op.dest_asset, op.destination
        )
    };

    let summary = match &path_description {
        Some(via) => format!("{} {}", conversion, via),
        None => conversion,
    };

    let payment_type = match op.payment_type {
        PathPaymentType::StrictSend => "strict_send",
        PathPaymentType::StrictReceive => "strict_receive",
    }
    .to_string();

    PathPaymentExplanation {
        summary,
        sender,
        destination: op.destination.clone(),
        send_asset: op.send_asset.clone(),
        send_amount: op.send_amount.clone(),
        dest_asset: op.dest_asset.clone(),
        dest_amount: op.dest_amount.clone(),
        path_description,
        payment_type,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::operation::{PathPaymentOperation, PathPaymentType};

    fn base_op() -> PathPaymentOperation {
        PathPaymentOperation {
            id: "1".to_string(),
            source_account: Some("GAAAA".to_string()),
            destination: "GBBB".to_string(),
            send_asset: "XLM (native)".to_string(),
            send_amount: "50".to_string(),
            dest_asset: "USDC (GISSUER)".to_string(),
            dest_amount: "45".to_string(),
            path: vec![],
            payment_type: PathPaymentType::StrictSend,
        }
    }

    #[test]
    fn test_same_asset_degenerate() {
        let op = PathPaymentOperation {
            send_asset: "XLM (native)".to_string(),
            dest_asset: "XLM (native)".to_string(),
            ..base_op()
        };
        let result = explain_path_payment(&op);
        assert!(result.summary.contains("sent 50 XLM (native) to GBBB"));
        assert!(!result.summary.contains("converted"));
        assert_eq!(result.path_description, None);
    }

    #[test]
    fn test_single_hop() {
        let op = PathPaymentOperation {
            path: vec!["BTC (GBTCISSUER)".to_string()],
            ..base_op()
        };
        let result = explain_path_payment(&op);
        assert!(result.summary.contains("converted to 45 USDC (GISSUER)"));
        assert_eq!(result.path_description, Some("via 1 intermediate asset".to_string()));
    }

    #[test]
    fn test_multi_hop() {
        let op = PathPaymentOperation {
            path: vec![
                "BTC (GBTCISSUER)".to_string(),
                "ETH (GETHISSUER)".to_string(),
            ],
            ..base_op()
        };
        let result = explain_path_payment(&op);
        assert!(result.summary.contains("via 2 intermediate assets"));
        assert_eq!(result.path_description, Some("via 2 intermediate assets".to_string()));
    }

    #[test]
    fn test_strict_send() {
        let result = explain_path_payment(&base_op());
        assert_eq!(result.payment_type, "strict_send");
        assert!(result.summary.contains("GAAAA sent 50 XLM (native) which was converted to 45 USDC (GISSUER) received by GBBB"));
    }

    #[test]
    fn test_strict_receive() {
        let op = PathPaymentOperation {
            payment_type: PathPaymentType::StrictReceive,
            ..base_op()
        };
        let result = explain_path_payment(&op);
        assert_eq!(result.payment_type, "strict_receive");
        assert!(result.summary.contains("converted to 45 USDC (GISSUER)"));
    }
}
