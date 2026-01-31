//! Memo interpretation and explanation.
//!
//! Provides human-readable explanations for transaction memos.

use crate::models::memo::Memo;

/// Explains a memo in human-readable terms.
///
/// Converts technical memo data into plain English that users can understand.
///
/// # Arguments
/// * `memo` - The memo to explain
///
/// # Returns
/// A human-readable explanation of the memo, or `None` if memo is `Memo::None`
///
/// # Examples
/// ```
/// use stellar_explain_core::models::memo::Memo;
/// use stellar_explain_core::explain::memo::explain_memo;
///
/// let text_memo = Memo::text("Invoice #12345").unwrap();
/// let explanation = explain_memo(&text_memo);
/// assert!(explanation.is_some());
/// assert!(explanation.unwrap().contains("Invoice #12345"));
///
/// let none_memo = Memo::None;
/// assert!(explain_memo(&none_memo).is_none());
/// ```
pub fn explain_memo(memo: &Memo) -> Option<String> {
    match memo {
        Memo::None => None,
        
        Memo::Text(text) => {
            Some(format!(
                "This transaction includes a text memo: \"{}\"",
                text
            ))
        }
        
        Memo::Id(id) => {
            Some(format!(
                "This transaction includes an ID memo: {}. This is typically used as a reference number, customer ID, or invoice number.",
                id
            ))
        }
        
        Memo::Hash(hash) => {
            Some(format!(
                "This transaction includes a hash memo: {}. This is typically used to reference a document, contract, or other data.",
                format_hash(hash)
            ))
        }
        
        Memo::Return(hash) => {
            Some(format!(
                "This transaction includes a return memo: {}. This indicates a refund or return transaction.",
                format_hash(hash)
            ))
        }
    }
}

/// Formats a hash for display (shows first 8 and last 8 characters).
fn format_hash(hash: &str) -> String {
    if hash.len() > 20 {
        format!("{}...{}", &hash[..8], &hash[hash.len()-8..])
    } else {
        hash.to_string()
    }
}

/// Returns a short memo type description.
///
/// # Examples
/// ```
/// use stellar_explain_core::models::memo::Memo;
/// use stellar_explain_core::explain::memo::memo_type_description;
///
/// assert_eq!(memo_type_description(&Memo::None), "No memo");
/// assert_eq!(memo_type_description(&Memo::text("test").unwrap()), "Text memo");
/// assert_eq!(memo_type_description(&Memo::id(123)), "ID memo");
/// ```
pub fn memo_type_description(memo: &Memo) -> &'static str {
    match memo {
        Memo::None => "No memo",
        Memo::Text(_) => "Text memo",
        Memo::Id(_) => "ID memo",
        Memo::Hash(_) => "Hash memo",
        Memo::Return(_) => "Return memo",
    }
}

/// Provides context about what a memo type is typically used for.
///
/// # Examples
/// ```
/// use stellar_explain_core::models::memo::Memo;
/// use stellar_explain_core::explain::memo::memo_usage_context;
///
/// let text_memo = Memo::text("payment ref").unwrap();
/// assert!(memo_usage_context(&text_memo).contains("payment references"));
/// ```
pub fn memo_usage_context(memo: &Memo) -> String {
    match memo {
        Memo::None => String::from("No additional context provided"),
        
        Memo::Text(_) => String::from(
            "Text memos are commonly used for payment references, order numbers, or short notes"
        ),
        
        Memo::Id(_) => String::from(
            "ID memos are commonly used for customer IDs, invoice numbers, or internal reference numbers"
        ),
        
        Memo::Hash(_) => String::from(
            "Hash memos are commonly used to reference documents, contracts, or to implement hash time-locked contracts (HTLCs)"
        ),
        
        Memo::Return(_) => String::from(
            "Return memos indicate refund or return transactions, referencing the original transaction"
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_explain_none_memo() {
        let memo = Memo::None;
        assert!(explain_memo(&memo).is_none());
    }

    #[test]
    fn test_explain_text_memo() {
        let memo = Memo::text("Payment for services").unwrap();
        let explanation = explain_memo(&memo).unwrap();

        assert!(explanation.contains("text memo"));
        assert!(explanation.contains("Payment for services"));
    }

    #[test]
    fn test_explain_id_memo() {
        let memo = Memo::id(987_654_321);
        let explanation = explain_memo(&memo).unwrap();

        assert!(explanation.contains("ID memo"));
        assert!(explanation.contains("987654321"));
        assert!(
            explanation.contains("reference number")
                || explanation.contains("customer ID")
        );
    }

    #[test]
    fn test_explain_hash_memo() {
        let hash =
            "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        let memo = Memo::hash(hash);
        let explanation = explain_memo(&memo).unwrap();

        assert!(explanation.contains("hash memo"));
        assert!(explanation.contains("abcdef12")); // first 8 chars
        assert!(explanation.contains("34567890")); // last 8 chars
    }

    #[test]
    fn test_explain_return_memo() {
        let hash =
            "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
        let memo = Memo::return_hash(hash);
        let explanation = explain_memo(&memo).unwrap();

        assert!(explanation.contains("return memo"));
        assert!(
            explanation.contains("refund")
                || explanation.contains("return")
        );
    }

    #[test]
    fn test_format_hash_long() {
        let hash =
            "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        let formatted = format_hash(hash);

        assert!(formatted.contains("abcdef12"));
        assert!(formatted.contains("34567890"));
        assert!(formatted.contains("..."));
        assert!(formatted.len() < hash.len());
    }

    #[test]
    fn test_format_hash_short() {
        let hash = "short";
        let formatted = format_hash(hash);

        assert_eq!(formatted, hash);
    }

    #[test]
    fn test_memo_type_description() {
        assert_eq!(memo_type_description(&Memo::None), "No memo");
        assert_eq!(
            memo_type_description(&Memo::text("test").unwrap()),
            "Text memo"
        );
        assert_eq!(memo_type_description(&Memo::id(123)), "ID memo");
        assert_eq!(memo_type_description(&Memo::hash("abc")), "Hash memo");
        assert_eq!(
            memo_type_description(&Memo::return_hash("def")),
            "Return memo"
        );
    }

    #[test]
    fn test_memo_usage_context() {
        let text_context =
            memo_usage_context(&Memo::text("test").unwrap());
        assert!(
            text_context.contains("payment references")
                || text_context.contains("order numbers")
        );

        let id_context = memo_usage_context(&Memo::id(123));
        assert!(
            id_context.contains("customer IDs")
                || id_context.contains("invoice")
        );

        let hash_context = memo_usage_context(&Memo::hash("abc"));
        assert!(
            hash_context.contains("documents")
                || hash_context.contains("contracts")
        );

        let return_context =
            memo_usage_context(&Memo::return_hash("def"));
        assert!(
            return_context.contains("refund")
                || return_context.contains("return")
        );
    }

    #[test]
    fn test_explain_memo_all_types() {
        let memos = vec![
            (Memo::None, false),
            (Memo::text("test").unwrap(), true),
            (Memo::id(123), true),
            (Memo::hash("abc123"), true),
            (Memo::return_hash("def456"), true),
        ];

        for (memo, should_have_explanation) in memos {
            let explanation = explain_memo(&memo);
            assert_eq!(explanation.is_some(), should_have_explanation);
        }
    }
}
