use axum::{
    extract::{Path, Query},
    Json,
};
use serde::Deserialize;
use crate::{
    models::transaction::{TransactionWithOperations, Operation},
    services::explain::TxResponse,
    errors::AppError,
};

#[derive(Deserialize)]
pub struct TxQuery {
    pub page: Option<usize>,
    pub limit: Option<usize>,
    pub r#type: Option<String>,
    pub asset: Option<String>,
    pub start: Option<String>,
    pub end: Option<String>,
}


pub async fn get_transaction(Path(hash): Path<String>) -> Result<Json<TxResponse>, AppError> {
    if hash == "invalid" {
        return Err(AppError::NotFound("Transaction not found".into()));
    }

    let tx = TransactionWithOperations {
        id: hash.clone(),
        successful: true,
        source_account: "Alice".into(),
        fee_charged: "100".into(),
        operation_count: 1,
        envelope_xdr: "AAAA...".into(),
        operations: vec![Operation::Payment {
            from: "Alice".into(),
            to: "Bob".into(),
            amount: "50".into(),
            asset: "XLM".into(),
        }],
    };

    Ok(Json(TxResponse::from(tx)))
}


pub async fn get_account_transactions(
    Path(address): Path<String>,
    Query(params): Query<TxQuery>,
) -> Result<Json<Vec<TxResponse>>, AppError> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(10);
    let offset = (page - 1) * limit;

    
    let all_txs = vec![
        TransactionWithOperations {
            id: "tx1".into(),
            successful: true,
            source_account: address.clone(),
            fee_charged: "100".into(),
            operation_count: 1,
            envelope_xdr: "AAAA...".into(),
            operations: vec![Operation::Payment {
                from: address.clone(),
                to: "Bob".into(),
                amount: "20".into(),
                asset: "XLM".into(),
            }],
        },
        TransactionWithOperations {
            id: "tx2".into(),
            successful: true,
            source_account: address.clone(),
            fee_charged: "100".into(),
            operation_count: 1,
            envelope_xdr: "AAAA...".into(),
            operations: vec![Operation::Payment {
                from: "Alice".into(),
                to: address.clone(),
                amount: "15".into(),
                asset: "USDC".into(),
            }],
        },
    ];

    
    let filtered: Vec<_> = all_txs
        .into_iter()
        .filter(|tx| {
            if let Some(ref asset) = params.asset {
                return tx.operations.iter().any(|op| match op {
                    Operation::Payment { asset: a, .. } => a == asset,
                    Operation::ManageOffer { selling, buying, .. } => selling == asset || buying == asset,
                    _ => false,
                });
            }
            true
        })
        .skip(offset)
        .take(limit)
        .collect();

    let responses: Vec<TxResponse> = filtered.into_iter().map(TxResponse::from).collect();

    Ok(Json(responses))
}