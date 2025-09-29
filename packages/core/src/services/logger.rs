use crate::models::transactions::{Transaction, Payment, AccountCreation};
use serde_json::Value;
use tracing::error;

pub fn parse_transaction(json_str: &str) -> Result<Transaction, serde_json::Error> {
    serde_json::from_str::<Transaction>(json_str).map_err(|e| {
        error!(error = %e, "Error parsing transaction JSON");
        e
    })
}

pub fn parse_operation(json_str: &str) -> Option<String> {
    let v: Value = serde_json::from_str(json_str).ok()?;
    let op_type = v.get("type")?.as_str()?;

    match op_type {
        "payment" => {
            let payment: Payment = serde_json::from_value(v).ok()?;
            Some(format!("Payment: from={} to={} amount={}", payment.from, payment.to, payment.amount))
        }
        "create_account" => {
            let acc: AccountCreation = serde_json::from_value(v).ok()?;
            Some(format!("CreateAccount: funder={} account={} balance={}", acc.funder, acc.account, acc.starting_balance))
        }
        _ => Some(format!("Unknown operation type: {}", op_type)),
    }
}
