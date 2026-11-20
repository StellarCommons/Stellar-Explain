//! Shared formatting helpers for operation explainers.

/// Shorten a long balance/entry ID for display: `"00000000abcd...ef12"`
pub(crate) fn shorten_id(id: &str) -> String {
    if id.len() > 16 {
        format!("{}...{}", &id[..8], &id[id.len() - 4..])
    } else {
        id.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shorten_long_id() {
        let long = "00000000abcdef1234567890abcdef1234567890abcdef1234567890abcdef12";
        let result = shorten_id(long);
        assert_eq!(result, "00000000...ef12");
    }

    #[test]
    fn test_shorten_short_id() {
        assert_eq!(shorten_id("shortid"), "shortid");
    }

    #[test]
    fn test_shorten_exactly_16_chars() {
        let id = "abcdefghijklmnop";
        assert_eq!(shorten_id(id), "abcdefghijklmnop");
    }

    #[test]
    fn test_shorten_17_chars() {
        let id = "abcdefghijklmnopq";
        let result = shorten_id(id);
        assert!(result.contains("..."));
    }
}
