use crate::models::operation::{ManageOfferOperation, OfferType};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ManageOfferExplanation {
    pub summary: String,
    pub seller: String,
    pub selling_asset: String,
    pub buying_asset: String,
    pub amount: String,
    pub price: String,
    pub offer_id: u64,
    pub action: String,
}

pub fn explain_manage_offer(op: &ManageOfferOperation) -> ManageOfferExplanation {
    if op.amount == "0" && op.offer_id > 0 {
        return ManageOfferExplanation {
            summary: format!("{} cancelled their existing offer #{}", op.seller, op.offer_id),
            seller: op.seller.clone(),
            selling_asset: op.selling_asset.clone(),
            buying_asset: op.buying_asset.clone(),
            amount: op.amount.clone(),
            price: op.price.clone(),
            offer_id: op.offer_id,
            action: "cancel".to_string(),
        };
    }

    let (action, base_asset, quote_asset) = match op.offer_type {
        OfferType::Sell => ("sell", &op.selling_asset, &op.buying_asset),
        OfferType::Buy => ("buy", &op.buying_asset, &op.selling_asset),
    };

    let summary = format!(
        "{} placed an order to {} {} {} for {} at a price of {} {} per {}",
        op.seller, action, op.amount, base_asset, quote_asset, op.price, quote_asset, base_asset,
    );

    let op_action = if op.offer_id == 0 { "new" } else { "update" };

    ManageOfferExplanation {
        summary,
        seller: op.seller.clone(),
        selling_asset: op.selling_asset.clone(),
        buying_asset: op.buying_asset.clone(),
        amount: op.amount.clone(),
        price: op.price.clone(),
        offer_id: op.offer_id,
        action: op_action.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::operation::{ManageOfferOperation, OfferType};

    fn base_op() -> ManageOfferOperation {
        ManageOfferOperation {
            id: "1".to_string(),
            seller: "GAAAA".to_string(),
            selling_asset: "XLM (native)".to_string(),
            buying_asset: "USDC (GISSUER)".to_string(),
            amount: "100".to_string(),
            price: "0.10".to_string(),
            offer_id: 0,
            offer_type: OfferType::Sell,
        }
    }

    #[test]
    fn test_new_sell_offer() {
        let result = explain_manage_offer(&base_op());
        assert_eq!(result.action, "new");
        assert!(result.summary.contains("placed an order to sell"));
        assert!(result.summary.contains("100"));
        assert!(result.summary.contains("XLM (native)"));
        assert!(result.summary.contains("USDC (GISSUER)"));
        assert!(result.summary.contains("0.10"));
    }

    #[test]
    fn test_update_offer() {
        let op = ManageOfferOperation { offer_id: 12345, ..base_op() };
        let result = explain_manage_offer(&op);
        assert_eq!(result.action, "update");
        assert!(result.summary.contains("placed an order to sell"));
    }

    #[test]
    fn test_cancel_offer() {
        let op = ManageOfferOperation {
            amount: "0".to_string(),
            offer_id: 12345,
            ..base_op()
        };
        let result = explain_manage_offer(&op);
        assert_eq!(result.action, "cancel");
        assert!(result.summary.contains("cancelled their existing offer #12345"));
    }

    #[test]
    fn test_buy_offer() {
        let op = ManageOfferOperation { offer_type: OfferType::Buy, ..base_op() };
        let result = explain_manage_offer(&op);
        assert_eq!(result.action, "new");
        assert!(result.summary.contains("placed an order to buy"));
        assert!(result.summary.contains("USDC (GISSUER)"));
    }
}
