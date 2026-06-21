use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OperationFailure {
    pub index: usize,
    pub code: String,
    pub explanation: String,
}

pub fn translate_tx_code(code: &str) -> String {
    let explanation = match code {
        "tx_bad_seq" => {
            "Sequence number is out of date — another transaction from this account may have been submitted first. Try again."
        }
        "tx_bad_auth" => "The transaction was not properly signed by the required keys.",
        "tx_insufficient_balance" => {
            "The account does not have enough XLM to cover this transaction and the minimum balance."
        }
        "tx_no_account" => "The source account does not exist on the Stellar network.",
        "tx_insufficient_fee" => "The fee offered was too low.",
        "tx_too_early" => "The transaction was submitted before its minimum time boundary.",
        "tx_too_late" => "The transaction expired before it was processed.",
        "tx_missing_operation" => "The transaction contains no operations.",
        "tx_bad_auth_extra" => "The transaction has more signatures than required.",
        _ => "An unexpected transaction error occurred.",
    };
    format!("Transaction failed: {explanation}")
}

pub fn translate_op_code(code: &str) -> &str {
    match code {
        "op_no_trust" => "The destination account has not opted in to hold this asset.",
        "op_underfunded" => "The source account does not have enough of this asset to send.",
        "op_no_destination" => "The destination account does not exist on the Stellar network.",
        "op_not_authorized" => {
            "The asset issuer has not authorised this account to hold the asset."
        }
        "op_line_full" => "The destination account's trust line is full and cannot receive more.",
        "op_no_issuer" => "The asset issuer account does not exist.",
        "op_low_reserve" => {
            "The account would fall below the minimum XLM reserve after this operation."
        }
        _ => "An unexpected operation error occurred.",
    }
}

/// Translate raw Horizon result codes into human-readable failure explanations.
///
/// Returns `(failure_reason, operation_failures)`.
/// `op_success` entries are excluded from `operation_failures`.
pub fn explain_failure(
    tx_code: Option<&str>,
    op_codes: &[String],
) -> (Option<String>, Vec<OperationFailure>) {
    let failure_reason = tx_code.map(translate_tx_code);

    let operation_failures = op_codes
        .iter()
        .enumerate()
        .filter(|(_, code)| code.as_str() != "op_success")
        .map(|(index, code)| OperationFailure {
            index,
            code: code.clone(),
            explanation: translate_op_code(code).to_string(),
        })
        .collect();

    (failure_reason, operation_failures)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── translate_tx_code ──────────────────────────────────────────────────

    #[test]
    fn test_tx_bad_seq() {
        let result = translate_tx_code("tx_bad_seq");
        assert!(result.starts_with("Transaction failed:"));
        assert!(result.contains("Sequence number is out of date"));
    }

    #[test]
    fn test_tx_bad_auth() {
        let result = translate_tx_code("tx_bad_auth");
        assert!(result.contains("not properly signed"));
    }

    #[test]
    fn test_tx_insufficient_balance() {
        let result = translate_tx_code("tx_insufficient_balance");
        assert!(result.contains("enough XLM"));
    }

    #[test]
    fn test_tx_no_account() {
        let result = translate_tx_code("tx_no_account");
        assert!(result.contains("does not exist on the Stellar network"));
    }

    #[test]
    fn test_tx_insufficient_fee() {
        let result = translate_tx_code("tx_insufficient_fee");
        assert!(result.contains("fee offered was too low"));
    }

    #[test]
    fn test_tx_too_early() {
        let result = translate_tx_code("tx_too_early");
        assert!(result.contains("minimum time boundary"));
    }

    #[test]
    fn test_tx_too_late() {
        let result = translate_tx_code("tx_too_late");
        assert!(result.contains("expired before it was processed"));
    }

    #[test]
    fn test_tx_missing_operation() {
        let result = translate_tx_code("tx_missing_operation");
        assert!(result.contains("contains no operations"));
    }

    #[test]
    fn test_tx_bad_auth_extra() {
        let result = translate_tx_code("tx_bad_auth_extra");
        assert!(result.contains("more signatures than required"));
    }

    #[test]
    fn test_tx_unknown_code_graceful_fallback() {
        let result = translate_tx_code("tx_some_future_code");
        assert!(result.starts_with("Transaction failed:"));
        assert!(result.contains("unexpected transaction error"));
    }

    // ── translate_op_code ──────────────────────────────────────────────────

    #[test]
    fn test_op_no_trust() {
        let result = translate_op_code("op_no_trust");
        assert!(result.contains("not opted in to hold this asset"));
    }

    #[test]
    fn test_op_underfunded() {
        let result = translate_op_code("op_underfunded");
        assert!(result.contains("does not have enough of this asset"));
    }

    #[test]
    fn test_op_no_destination() {
        let result = translate_op_code("op_no_destination");
        assert!(result.contains("destination account does not exist"));
    }

    #[test]
    fn test_op_not_authorized() {
        let result = translate_op_code("op_not_authorized");
        assert!(result.contains("not authorised"));
    }

    #[test]
    fn test_op_line_full() {
        let result = translate_op_code("op_line_full");
        assert!(result.contains("trust line is full"));
    }

    #[test]
    fn test_op_no_issuer() {
        let result = translate_op_code("op_no_issuer");
        assert!(result.contains("issuer account does not exist"));
    }

    #[test]
    fn test_op_low_reserve() {
        let result = translate_op_code("op_low_reserve");
        assert!(result.contains("minimum XLM reserve"));
    }

    #[test]
    fn test_op_unknown_code_graceful_fallback() {
        let result = translate_op_code("op_future_code");
        assert!(!result.is_empty());
        assert!(result.contains("unexpected operation error"));
    }

    // ── explain_failure ────────────────────────────────────────────────────

    #[test]
    fn test_explain_failure_with_tx_and_op_codes() {
        let op_codes = vec!["op_no_trust".to_string(), "op_success".to_string()];
        let (reason, failures) = explain_failure(Some("tx_bad_seq"), &op_codes);

        assert!(reason.is_some());
        assert!(reason.unwrap().contains("Sequence number"));
        assert_eq!(failures.len(), 1);
        assert_eq!(failures[0].index, 0);
        assert_eq!(failures[0].code, "op_no_trust");
        assert!(failures[0].explanation.contains("not opted in"));
    }

    #[test]
    fn test_explain_failure_op_success_excluded() {
        let op_codes = vec!["op_success".to_string(), "op_success".to_string()];
        let (_, failures) = explain_failure(Some("tx_bad_seq"), &op_codes);
        assert!(failures.is_empty());
    }

    #[test]
    fn test_explain_failure_preserves_original_index() {
        let op_codes = vec![
            "op_success".to_string(),
            "op_underfunded".to_string(),
            "op_success".to_string(),
        ];
        let (_, failures) = explain_failure(None, &op_codes);
        assert_eq!(failures.len(), 1);
        assert_eq!(failures[0].index, 1);
    }

    #[test]
    fn test_explain_failure_no_tx_code() {
        let (reason, _) = explain_failure(None, &[]);
        assert!(reason.is_none());
    }

    #[test]
    fn test_explain_failure_empty_op_codes() {
        let (reason, failures) = explain_failure(Some("tx_bad_auth"), &[]);
        assert!(reason.is_some());
        assert!(failures.is_empty());
    }

    #[test]
    fn test_explain_failure_successful_transaction_no_codes() {
        let (reason, failures) = explain_failure(None, &[]);
        assert!(reason.is_none());
        assert!(failures.is_empty());
    }

    #[test]
    fn test_explain_failure_multiple_op_failures() {
        let op_codes = vec!["op_no_trust".to_string(), "op_no_destination".to_string()];
        let (_, failures) = explain_failure(Some("tx_bad_seq"), &op_codes);
        assert_eq!(failures.len(), 2);
        assert_eq!(failures[0].index, 0);
        assert_eq!(failures[1].index, 1);
    }
}
