//! Transaction memo types and models.
//!
//! Stellar supports several memo types to attach additional context to transactions.
//! This module provides type-safe representations of all memo variants.

use serde::{Deserialize, Serialize};

/// Transaction memo containing additional context or metadata.
///
/// Stellar supports 5 memo types:
/// - None: No memo attached
/// - Text: UTF-8 string up to 28 bytes
/// - ID: Unsigned 64-bit integer
/// - Hash: 32-byte hash
/// - Return: 32-byte hash for returns/refunds
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", content = "value")]
pub enum Memo {
    /// No memo attached to the transaction
    #[serde(rename = "none")]
    None,

    /// Text memo: UTF-8 string up to 28 bytes
    /// Common uses: order numbers, payment references, notes
    #[serde(rename = "text")]
    Text(String),

    /// ID memo: Unsigned 64-bit integer
    /// Common uses: customer IDs, invoice numbers
    #[serde(rename = "id")]
    Id(u64),

    /// Hash memo: 32-byte hash
    /// Common uses: document hashes, preimage for HTLCs
    #[serde(rename = "hash")]
    Hash(String),

    /// Return memo: 32-byte hash for returns/refunds
    /// Common uses: indicating a refund/return transaction
    #[serde(rename = "return")]
    Return(String),
}

impl Memo {
    /// Creates a text memo.
    ///
    /// # Arguments
    /// * `text` - The text content (max 28 bytes)
    ///
    /// # Returns
    /// `Some(Memo::Text)` if text is <= 28 bytes, `None` otherwise
    ///
    /// # Examples
    /// ```
    /// use stellar_explain_core::models::memo::Memo;
    ///
    /// let memo = Memo::text("Payment for invoice #123");
    /// assert!(memo.is_some());
    ///
    /// let too_long = Memo::text("This text is definitely way too long for a Stellar memo");
    /// assert!(too_long.is_none());
    /// ```
    pub fn text(text: impl Into<String>) -> Option<Self> {
        let text = text.into();
        if text.as_bytes().len() <= 28 {
            Some(Memo::Text(text))
        } else {
            None
        }
    }

    /// Creates an ID memo.
    ///
    /// # Examples
    /// ```
    /// use stellar_explain_core::models::memo::Memo;
    ///
    /// let memo = Memo::id(12345);
    /// assert_eq!(memo, Memo::Id(12345));
    /// ```
    pub fn id(id: u64) -> Self {
        Memo::Id(id)
    }

    /// Creates a hash memo.
    ///
    /// # Arguments
    /// * `hash` - 32-byte hash as hex string
    ///
    /// # Examples
    /// ```
    /// use stellar_explain_core::models::memo::Memo;
    ///
    /// let hash = "abcd1234".to_string();
    /// let memo = Memo::hash(hash.clone());
    /// assert_eq!(memo, Memo::Hash(hash));
    /// ```
    pub fn hash(hash: impl Into<String>) -> Self {
        Memo::Hash(hash.into())
    }

    /// Creates a return memo.
    ///
    /// # Examples
    /// ```
    /// use stellar_explain_core::models::memo::Memo;
    ///
    /// let hash = "efgh5678".to_string();
    /// let memo = Memo::return_hash(hash.clone());
    /// assert_eq!(memo, Memo::Return(hash));
    /// ```
    pub fn return_hash(hash: impl Into<String>) -> Self {
        Memo::Return(hash.into())
    }

    /// Returns the memo type as a string.
    ///
    /// # Examples
    /// ```
    /// use stellar_explain_core::models::memo::Memo;
    ///
    /// assert_eq!(Memo::None.memo_type(), "none");
    /// assert_eq!(Memo::text("hello").unwrap().memo_type(), "text");
    /// assert_eq!(Memo::id(123).memo_type(), "id");
    /// ```
    pub fn memo_type(&self) -> &str {
        match self {
            Memo::None => "none",
            Memo::Text(_) => "text",
            Memo::Id(_) => "id",
            Memo::Hash(_) => "hash",
            Memo::Return(_) => "return",
        }
    }

    /// Checks if this is a None memo.
    ///
    /// # Examples
    /// ```
    /// use stellar_explain_core::models::memo::Memo;
    ///
    /// assert!(Memo::None.is_none());
    /// assert!(!Memo::text("hello").unwrap().is_none());
    /// ```
    pub fn is_none(&self) -> bool {
        matches!(self, Memo::None)
    }

    /// Returns the memo value as a string for display.
    ///
    /// # Examples
    /// ```
    /// use stellar_explain_core::models::memo::Memo;
    ///
    /// assert_eq!(Memo::None.value_string(), "");
    /// assert_eq!(Memo::text("hello").unwrap().value_string(), "hello");
    /// assert_eq!(Memo::id(12345).value_string(), "12345");
    /// ```
    pub fn value_string(&self) -> String {
        match self {
            Memo::None => String::new(),
            Memo::Text(text) => text.clone(),
            Memo::Id(id) => id.to_string(),
            Memo::Hash(hash) => hash.clone(),
            Memo::Return(hash) => hash.clone(),
        }
    }
}

impl Default for Memo {
    fn default() -> Self {
        Memo::None
    }
}

impl std::fmt::Display for Memo {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Memo::None => write!(f, "No memo"),
            Memo::Text(text) => write!(f, "Text: {}", text),
            Memo::Id(id) => write!(f, "ID: {}", id),
            Memo::Hash(hash) => write!(f, "Hash: {}", hash),
            Memo::Return(hash) => write!(f, "Return: {}", hash),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_text_memo_valid() {
        let memo = Memo::text("Payment ref: ABC123");
        assert!(memo.is_some());
        assert_eq!(memo.unwrap().memo_type(), "text");
    }

    #[test]
    fn test_text_memo_max_length() {
        // Exactly 28 bytes should work
        let memo = Memo::text("1234567890123456789012345678");
        assert!(memo.is_some());
    }

    #[test]
    fn test_text_memo_too_long() {
        // 29 bytes should fail
        let memo = Memo::text("12345678901234567890123456789");
        assert!(memo.is_none());
    }

    #[test]
    fn test_id_memo() {
        let memo = Memo::id(987654321);
        assert_eq!(memo.memo_type(), "id");
        assert_eq!(memo.value_string(), "987654321");
    }

    #[test]
    fn test_hash_memo() {
        let hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        let memo = Memo::hash(hash);
        assert_eq!(memo.memo_type(), "hash");
        assert_eq!(memo.value_string(), hash);
    }

    #[test]
    fn test_return_memo() {
        let hash = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
        let memo = Memo::return_hash(hash);
        assert_eq!(memo.memo_type(), "return");
        assert_eq!(memo.value_string(), hash);
    }

    #[test]
    fn test_none_memo() {
        let memo = Memo::None;
        assert!(memo.is_none());
        assert_eq!(memo.memo_type(), "none");
        assert_eq!(memo.value_string(), "");
    }

    #[test]
    fn test_memo_display() {
        assert_eq!(Memo::None.to_string(), "No memo");
        assert_eq!(
            Memo::text("test").unwrap().to_string(),
            "Text: test"
        );
        assert_eq!(Memo::id(123).to_string(), "ID: 123");
        assert_eq!(Memo::hash("abc").to_string(), "Hash: abc");
        assert_eq!(Memo::return_hash("def").to_string(), "Return: def");
    }

    #[test]
    fn test_default_memo() {
        let memo = Memo::default();
        assert_eq!(memo, Memo::None);
    }

    #[test]
    fn test_memo_serialization() {
        let memos = vec![
            Memo::None,
            Memo::text("hello").unwrap(),
            Memo::id(42),
            Memo::hash("test_hash".to_string()),
            Memo::return_hash("return_hash".to_string()),
        ];

        for memo in memos {
            let json = serde_json::to_string(&memo).unwrap();
            let deserialized: Memo = serde_json::from_str(&json).unwrap();
            assert_eq!(memo, deserialized);
        }
    }
}