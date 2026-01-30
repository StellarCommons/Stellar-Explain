/// Module for interpreting and explaining Stellar transaction memos
/// 
/// Memos provide critical context for payments but are often poorly understood.
/// This module detects memo presence, identifies the type, and provides human-readable explanations.

use std::fmt;

/// Represents the different types of memos in Stellar transactions
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MemoType {
    /// No memo present
    None,
    /// Plain text memo (up to 28 bytes)
    Text(String),
    /// Numeric identifier (64-bit unsigned integer)
    Id(u64),
    /// 32-byte hash (typically SHA-256)
    Hash([u8; 32]),
    /// 32-byte hash for return transactions
    Return([u8; 32]),
}

/// Result of memo interpretation with human-readable explanation
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MemoExplanation {
    /// The type and content of the memo
    pub memo_type: MemoType,
    /// Human-readable explanation of the memo
    pub explanation: String,
}

impl MemoType {
    /// Check if a memo is present (not None)
    pub fn is_present(&self) -> bool {
        !matches!(self, MemoType::None)
    }

    /// Get the type name as a string
    pub fn type_name(&self) -> &'static str {
        match self {
            MemoType::None => "none",
            MemoType::Text(_) => "text",
            MemoType::Id(_) => "id",
            MemoType::Hash(_) => "hash",
            MemoType::Return(_) => "return",
        }
    }
}

impl fmt::Display for MemoType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MemoType::None => write!(f, "No memo"),
            MemoType::Text(text) => write!(f, "Text: \"{}\"", text),
            MemoType::Id(id) => write!(f, "ID: {}", id),
            MemoType::Hash(hash) => write!(f, "Hash: {}", hex_encode(hash)),
            MemoType::Return(hash) => write!(f, "Return: {}", hex_encode(hash)),
        }
    }
}

/// Interpret a memo and provide a human-readable explanation
pub fn interpret_memo(memo: MemoType) -> Option<MemoExplanation> {
    if !memo.is_present() {
        return None;
    }

    let explanation = match &memo {
        MemoType::None => return None,
        
        MemoType::Text(text) => {
            format!(
                "Text memo: \"{}\". This is a human-readable message that provides context \
                 for the transaction. Often used for notes, invoice numbers, or instructions.",
                text
            )
        }
        
        MemoType::Id(id) => {
            format!(
                "ID memo: {}. This is a numeric identifier (64-bit unsigned integer) typically \
                 used to link the payment to a specific invoice, order, or account in the \
                 recipient's system. Common with exchanges and payment processors.",
                id
            )
        }
        
        MemoType::Hash(hash) => {
            format!(
                "Hash memo: {}. This is a 32-byte cryptographic hash (typically SHA-256) used \
                 to reference external data or prove the transaction relates to a specific \
                 document or event without revealing the content.",
                hex_encode(hash)
            )
        }
        
        MemoType::Return(hash) => {
            format!(
                "Return memo: {}. This is a 32-byte hash specifically intended for return \
                 transactions. If this payment needs to be refunded, the sender can use this \
                 hash to identify which transaction is being returned.",
                hex_encode(hash)
            )
        }
    };

    Some(MemoExplanation {
        memo_type: memo,
        explanation,
    })
}

/// Format a memo explanation for display in transaction output
/// Returns None if no memo is present (to avoid noise)
pub fn format_memo_for_output(memo: MemoType) -> Option<String> {
    interpret_memo(memo).map(|explanation| {
        format!("Memo ({}): {}", explanation.memo_type.type_name(), explanation.explanation)
    })
}

/// Helper function to encode bytes as hexadecimal string
fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>()
}

/// Helper function to decode hexadecimal string to bytes
/// Returns None if the string is invalid hex or wrong length
pub fn hex_decode_32(s: &str) -> Option<[u8; 32]> {
    if s.len() != 64 {
        return None;
    }

    let mut result = [0u8; 32];
    for i in 0..32 {
        let byte_str = &s[i * 2..i * 2 + 2];
        result[i] = u8::from_str_radix(byte_str, 16).ok()?;
    }
    Some(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_memo_none_no_interpretation() {
        let memo = MemoType::None;
        assert!(!memo.is_present());
        assert_eq!(interpret_memo(memo), None);
        assert_eq!(format_memo_for_output(MemoType::None), None);
    }

    #[test]
    fn test_memo_text_interpretation() {
        let memo = MemoType::Text("Invoice #12345".to_string());
        assert!(memo.is_present());
        assert_eq!(memo.type_name(), "text");

        let explanation = interpret_memo(memo.clone()).unwrap();
        assert_eq!(explanation.memo_type, memo);
        assert!(explanation.explanation.contains("Invoice #12345"));
        assert!(explanation.explanation.contains("human-readable"));
        assert!(explanation.explanation.contains("context"));
    }

    #[test]
    fn test_memo_text_empty() {
        let memo = MemoType::Text("".to_string());
        assert!(memo.is_present());
        
        let explanation = interpret_memo(memo).unwrap();
        assert!(explanation.explanation.contains("Text memo"));
    }

    #[test]
    fn test_memo_id_interpretation() {
        let memo = MemoType::Id(9876543210);
        assert!(memo.is_present());
        assert_eq!(memo.type_name(), "id");

        let explanation = interpret_memo(memo.clone()).unwrap();
        assert_eq!(explanation.memo_type, memo);
        assert!(explanation.explanation.contains("9876543210"));
        assert!(explanation.explanation.contains("numeric identifier"));
        assert!(explanation.explanation.contains("invoice"));
    }

    #[test]
    fn test_memo_id_zero() {
        let memo = MemoType::Id(0);
        assert!(memo.is_present());
        
        let explanation = interpret_memo(memo).unwrap();
        assert!(explanation.explanation.contains("ID memo: 0"));
    }

    #[test]
    fn test_memo_hash_interpretation() {
        let hash = [0xab; 32]; // All bytes set to 0xab
        let memo = MemoType::Hash(hash);
        assert!(memo.is_present());
        assert_eq!(memo.type_name(), "hash");

        let explanation = interpret_memo(memo.clone()).unwrap();
        assert_eq!(explanation.memo_type, memo);
        assert!(explanation.explanation.contains("ababababababababababababababababababababababababababababababab"));
        assert!(explanation.explanation.contains("cryptographic hash"));
        assert!(explanation.explanation.contains("32-byte"));
    }

    #[test]
    fn test_memo_return_interpretation() {
        let hash = [0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
                    0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
                    0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
                    0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0];
        let memo = MemoType::Return(hash);
        assert!(memo.is_present());
        assert_eq!(memo.type_name(), "return");

        let explanation = interpret_memo(memo.clone()).unwrap();
        assert_eq!(explanation.memo_type, memo);
        assert!(explanation.explanation.contains("return"));
        assert!(explanation.explanation.contains("refund"));
    }

    #[test]
    fn test_format_memo_for_output() {
        let memo = MemoType::Text("Payment for services".to_string());
        let output = format_memo_for_output(memo).unwrap();
        assert!(output.starts_with("Memo (text):"));
        assert!(output.contains("Payment for services"));
    }

    #[test]
    fn test_format_memo_for_output_no_noise_when_none() {
        let output = format_memo_for_output(MemoType::None);
        assert_eq!(output, None);
    }

    #[test]
    fn test_hex_encode() {
        let bytes = [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef];
        assert_eq!(hex_encode(&bytes), "0123456789abcdef");
    }

    #[test]
    fn test_hex_decode_32_valid() {
        let hex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        let result = hex_decode_32(hex).unwrap();
        assert_eq!(result[0], 0x01);
        assert_eq!(result[1], 0x23);
        assert_eq!(result[31], 0xef);
    }

    #[test]
    fn test_hex_decode_32_invalid_length() {
        assert_eq!(hex_decode_32("abc"), None);
        assert_eq!(hex_decode_32("0123456789abcdef"), None); // Too short
    }

    #[test]
    fn test_hex_decode_32_invalid_chars() {
        let hex = "gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg";
        assert_eq!(hex_decode_32(hex), None);
    }

    #[test]
    fn test_memo_display_trait() {
        assert_eq!(format!("{}", MemoType::None), "No memo");
        assert_eq!(format!("{}", MemoType::Text("test".to_string())), "Text: \"test\"");
        assert_eq!(format!("{}", MemoType::Id(42)), "ID: 42");
        
        let hash = [0xff; 32];
        let display = format!("{}", MemoType::Hash(hash));
        assert!(display.starts_with("Hash: "));
        assert!(display.contains("ffffffff"));
    }

    #[test]
    fn test_all_memo_types_have_explanations() {
        // Ensure every memo type (except None) produces an explanation
        let text_memo = MemoType::Text("test".to_string());
        let id_memo = MemoType::Id(123);
        let hash_memo = MemoType::Hash([0; 32]);
        let return_memo = MemoType::Return([0; 32]);

        assert!(interpret_memo(text_memo).is_some());
        assert!(interpret_memo(id_memo).is_some());
        assert!(interpret_memo(hash_memo).is_some());
        assert!(interpret_memo(return_memo).is_some());
    }
}