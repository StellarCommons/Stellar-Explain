use crate::models::{Transaction, Payment, AccountCreation};
use serde_json::Value;

pub fn parse_transaction(json_str: &str) -> Result<Transaction, serde_json::Error> {
    serde_json::from_str::<Transaction>(json_str)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_payment_operation() {
        let payment_json = r#"
        {
            "type": "payment",
            "from": "GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3",
            "to": "GAAZI4TCR3TY5OJHCTJC2A4QSM5M8G7BNSYZ5IQQWZ2PBVOCW7YBQJ6C",
            "asset_type": "native",
            "amount": "10.0000000"
        }"#;

        let result = parse_operation(payment_json);
        assert!(result.is_some());

        let expected = "Payment: from=GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3 to=GAAZI4TCR3TY5OJHCTJC2A4QSM5M8G7BNSYZ5IQQWZ2PBVOCW7YBQJ6C amount=10.0000000";
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn test_parse_create_account_operation() {
        let create_account_json = r#"
        {
            "type": "create_account",
            "funder": "GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3",
            "account": "GAAZI4TCR3TY5OJHCTJC2A4QSM5M8G7BNSYZ5IQQWZ2PBVOCW7YBQJ6C",
            "starting_balance": "20.0000000"
        }"#;

        let result = parse_operation(create_account_json);
        assert!(result.is_some());

        let expected = "CreateAccount: funder=GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3 account=GAAZI4TCR3TY5OJHCTJC2A4QSM5M8G7BNSYZ5IQQWZ2PBVOCW7YBQJ6C balance=20.0000000";
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn test_parse_unknown_operation_type() {
        let unknown_json = r#"
        {
            "type": "unknown_operation",
            "field1": "value1"
        }"#;

        let result = parse_operation(unknown_json);
        assert!(result.is_some());
        assert_eq!(result.unwrap(), "Unknown operation type: unknown_operation");
    }

    #[test]
    fn test_parse_invalid_json() {
        let invalid_json = r#"{ invalid json }"#;
        let result = parse_operation(invalid_json);
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_json_without_type() {
        let no_type_json = r#"
        {
            "from": "GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3",
            "to": "GAAZI4TCR3TY5OJHCTJC2A4QSM5M8G7BNSYZ5IQQWZ2PBVOCW7YBQJ6C",
            "amount": "10.0000000"
        }"#;

        let result = parse_operation(no_type_json);
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_transaction_basic() {
        let transaction_json = r#"
        {
            "id": "3389e9f0f1a65f19736cacf544c2e825313e8447f569233bb8db39aa607c8889",
            "successful": true,
            "source_account": "GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3",
            "fee_charged": "100",
            "operation_count": 1,
            "envelope_xdr": "AAAAAgAAAABi/B0L0JGythwN1lY0aypo19NHxvLCyO5tBEcCVvwF9w3gtrOnZAAAAAAAAAPCAAAABQAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAKUE1zAAAAAAAAAAAgAAAAAGOEZGXXJWRTU="
        }"#;

        let result = parse_transaction(transaction_json);
        assert!(result.is_ok());

        let transaction = result.unwrap();
        assert_eq!(transaction.id, "3389e9f0f1a65f19736cacf544c2e825313e8447f569233bb8db39aa607c8889");
        assert_eq!(transaction.successful, true);
        assert_eq!(transaction.source_account, "GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3");
        assert_eq!(transaction.fee_charged, "100");
        assert_eq!(transaction.operation_count, 1);
    }

    #[test]
    fn test_parse_transaction_invalid_json() {
        let invalid_json = r#"{ "incomplete": json }"#;
        let result = parse_transaction(invalid_json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_transaction_missing_fields() {
        let incomplete_json = r#"
        {
            "id": "3389e9f0f1a65f19736cacf544c2e825313e8447f569233bb8db39aa607c8889",
            "successful": true
        }"#;

        let result = parse_transaction(incomplete_json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_payment_with_custom_asset() {
        let payment_json = r#"
        {
            "type": "payment",
            "from": "GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3",
            "to": "GAAZI4TCR3TY5OJHCTJC2A4QSM5M8G7BNSYZ5IQQWZ2PBVOCW7YBQJ6C",
            "asset_type": "credit_alphanum4",
            "amount": "100.0000000"
        }"#;

        let result = parse_operation(payment_json);
        assert!(result.is_some());

        let expected = "Payment: from=GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3 to=GAAZI4TCR3TY5OJHCTJC2A4QSM5M8G7BNSYZ5IQQWZ2PBVOCW7YBQJ6C amount=100.0000000";
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn test_parse_payment_missing_required_fields() {
        let incomplete_payment_json = r#"
        {
            "type": "payment",
            "from": "GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3",
            "asset_type": "native"
        }"#;

        let result = parse_operation(incomplete_payment_json);
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_create_account_missing_required_fields() {
        let incomplete_create_account_json = r#"
        {
            "type": "create_account",
            "funder": "GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3"
        }"#;

        let result = parse_operation(incomplete_create_account_json);
        assert!(result.is_none());
    }
}