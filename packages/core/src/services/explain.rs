use crate::models::memo::Memo;
use crate::models::operation::Operation;
use crate::models::transaction::Transaction;
use crate::services::horizon::{HorizonOperation, HorizonTransaction};

pub fn map_transaction_to_domain(
    tx: HorizonTransaction,
    operations: Vec<HorizonOperation>,
) -> Transaction {
    let ops = operations.into_iter().map(Operation::from).collect();

    // Map memo fields from Horizon into the domain Memo model.
    // Horizon always returns memo_type — it's "none" when there is no memo.
    // The memo value itself is only present for non-none memo types.
    let memo = map_memo(tx.memo_type.as_deref(), tx.memo.as_deref());

    Transaction::new(tx.hash, tx.successful, tx.fee_charged.parse().unwrap_or(0), ops, memo)
}

/// Converts raw Horizon memo fields into a domain Memo.
///
/// Horizon memo types: "none", "text", "id", "hash", "return"
fn map_memo(memo_type: Option<&str>, memo_value: Option<&str>) -> Option<Memo> {
    match memo_type {
        None | Some("none") => None,
        Some("text") => memo_value.and_then(|v| Memo::text(v)),
        Some("id") => memo_value
            .and_then(|v| v.parse::<u64>().ok())
            .map(Memo::id),
        Some("hash") => memo_value.map(|v| Memo::hash(v)),
        Some("return") => memo_value.map(|v| Memo::return_hash(v)),
        Some(_) => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_map_memo_none_type() {
        assert_eq!(map_memo(Some("none"), None), None);
    }

    #[test]
    fn test_map_memo_missing_type() {
        assert_eq!(map_memo(None, None), None);
    }

    #[test]
    fn test_map_memo_text() {
        let memo = map_memo(Some("text"), Some("Hello Stellar"));
        assert!(memo.is_some());
        assert_eq!(memo.unwrap().memo_type(), "text");
    }

    #[test]
    fn test_map_memo_id() {
        let memo = map_memo(Some("id"), Some("12345"));
        assert!(memo.is_some());
        assert_eq!(memo.unwrap().memo_type(), "id");
    }

    #[test]
    fn test_map_memo_hash() {
        let memo = map_memo(Some("hash"), Some("abc123deadbeef"));
        assert!(memo.is_some());
        assert_eq!(memo.unwrap().memo_type(), "hash");
    }

    #[test]
    fn test_map_memo_return() {
        let memo = map_memo(Some("return"), Some("abc123deadbeef"));
        assert!(memo.is_some());
        assert_eq!(memo.unwrap().memo_type(), "return");
    }

    #[test]
    fn test_map_memo_unknown_type() {
        assert_eq!(map_memo(Some("unknown_future_type"), Some("value")), None);
    }
}