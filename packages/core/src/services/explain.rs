use crate::models::transaction::{Operation, TransactionWithOperations, Transaction};
use serde::Serialize;

impl Operation {
    pub fn explain(&self) -> String {
        match self {
            Operation::Payment { from, to, amount, asset } => {
                format!("{} sent {} {} to {}", from, amount, asset, to)
            }
            Operation::CreateAccount { funder, new_account, starting_balance } => {
                format!("New account {} created by {} with {} XLM", new_account, funder, starting_balance)
            }
            Operation::ManageOffer { seller, selling, buying, amount, price } => {
                format!("{} placed/updated offer: selling {} {} for {} {} (price {})",
                    seller, amount, selling, amount, buying, price)
            }
        }
    }
}

#[derive(Debug, Serialize)]
pub struct TxResponse {
    pub raw: Transaction,
    pub summary: Vec<String>,
}

impl From<TransactionWithOperations> for TxResponse {
    fn from(tx: TransactionWithOperations) -> Self {
        let summary = tx.operations.iter().map(|op| op.explain()).collect();
        let raw = Transaction {
            id: tx.id,
            successful: tx.successful,
            source_account: tx.source_account,
            fee_charged: tx.fee_charged,
            operation_count: tx.operation_count,
            envelope_xdr: tx.envelope_xdr,
        };
        TxResponse { raw, summary }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::transaction::{TransactionWithOperations, Operation};

    #[test]
    fn test_payment_operation_explanation() {
        let operation = Operation::Payment {
            from: "Alice".to_string(),
            to: "Bob".to_string(),
            amount: "50".to_string(),
            asset: "XLM".to_string(),
        };

        let explanation = operation.explain();
        assert_eq!(explanation, "Alice sent 50 XLM to Bob");
    }

    #[test]
    fn test_create_account_operation_explanation() {
        let operation = Operation::CreateAccount {
            funder: "Alice".to_string(),
            new_account: "Bob".to_string(),
            starting_balance: "100".to_string(),
        };

        let explanation = operation.explain();
        assert_eq!(explanation, "New account Bob created by Alice with 100 XLM");
    }

    #[test]
    fn test_manage_offer_operation_explanation() {
        let operation = Operation::ManageOffer {
            seller: "Alice".to_string(),
            selling: "XLM".to_string(),
            buying: "USDC".to_string(),
            amount: "100".to_string(),
            price: "0.1".to_string(),
        };

        let explanation = operation.explain();
        assert_eq!(explanation, "Alice placed/updated offer: selling 100 XLM for 100 USDC (price 0.1)");
    }

    #[test]
    fn test_transaction_with_operations_to_response() {
        let tx = TransactionWithOperations {
            id: "test_tx".to_string(),
            successful: true,
            source_account: "Alice".to_string(),
            fee_charged: "100".to_string(),
            operation_count: 2,
            envelope_xdr: "AAAA...".to_string(),
            operations: vec![
                Operation::Payment {
                    from: "Alice".to_string(),
                    to: "Bob".to_string(),
                    amount: "50".to_string(),
                    asset: "XLM".to_string(),
                },
                Operation::CreateAccount {
                    funder: "Alice".to_string(),
                    new_account: "Charlie".to_string(),
                    starting_balance: "25".to_string(),
                }
            ],
        };

        let response = TxResponse::from(tx);

        assert_eq!(response.raw.id, "test_tx");
        assert_eq!(response.summary.len(), 2);
        assert_eq!(response.summary[0], "Alice sent 50 XLM to Bob");
        assert_eq!(response.summary[1], "New account Charlie created by Alice with 25 XLM");
    }
}