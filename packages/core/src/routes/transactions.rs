use axum::{
    extract::{Path, Query},
    Json,
};
use serde::Deserialize;
use crate::{
    models::transaction::{Transaction, Operation},
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

    let tx = Transaction {
        hash: hash.clone(),
        source_account: "Alice".into(),
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
        Transaction {
            hash: "tx1".into(),
            source_account: address.clone(),
            operations: vec![Operation::Payment {
                from: address.clone(),
                to: "Bob".into(),
                amount: "20".into(),
                asset: "XLM".into(),
            }],
        },
        Transaction {
            hash: "tx2".into(),
            source_account: address.clone(),
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