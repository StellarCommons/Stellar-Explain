//! PaymentIntent domain model for structuring a payment someone wants to make.
//!
//! This is a *planning* model — it represents intent, not an on-chain transaction.
//! It performs structural validation only (no Horizon calls, no XDR building).
//!
//! Depends on `StellarAddress`, `Asset`, `Amount` from `models::stellar`, and `Memo`
//! from `models::memo`.

use serde::{Deserialize, Serialize};

use crate::errors::ValidationError;
use crate::models::memo::Memo;
use crate::models::stellar::{Amount, Asset, StellarAddress};

/// A domain representation of a payment someone wants to make.
///
/// `PaymentIntent` is constructed via [`PaymentIntent::try_new`] which performs
/// structural validation — it rejects zero amounts and over-length text memos,
/// but does **not** make any network calls.
///
/// # Self-payments
///
/// `source == destination` is **permitted**. Stellar itself allows self-payments
/// (e.g. to convert between asset types via a path payment, or for bookkeeping).
/// Rejecting them here would be an unnecessary policy restriction with no
/// technical benefit — and would silently break valid use cases.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PaymentIntent {
    /// The address that will send the payment.
    pub source: StellarAddress,

    /// The address that will receive the payment.
    pub destination: StellarAddress,

    /// The asset being sent.
    pub asset: Asset,

    /// The amount being sent (in stroops for native, or units for credit assets).
    pub amount: Amount,

    /// Optional memo attached to the transaction.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<Memo>,
}

impl PaymentIntent {
    /// Creates a new `PaymentIntent` after structural validation.
    ///
    /// This is a pure, synchronous function — no I/O, no Horizon calls.
    /// The addresses should already be validated `StellarAddress` values
    /// (enforced by the type system, not re-checked here).
    ///
    /// # Validation rules
    ///
    /// - `amount` must be non-zero ([`ValidationError::ZeroAmount`])
    /// - If `memo` is `Some(Memo::Text(..))`, its byte length must be ≤ 28
    ///   ([`ValidationError::InvalidMemo`])
    /// - `source` and `destination` may be the same address (self-payments are
    ///   allowed by Stellar)
    ///
    /// # Examples
    ///
    /// ```
    /// use stellar_explain_core::models::payment_intent::PaymentIntent;
    /// use stellar_explain_core::models::stellar::{StellarAddress, Asset, Amount};
    /// use stellar_explain_core::models::memo::Memo;
    ///
    /// let source: StellarAddress = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF".parse().unwrap();
    /// let dest: StellarAddress = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF".parse().unwrap();
    /// let asset = Asset::Native;
    /// let amount = Amount::from_stroops(100_500_000).unwrap(); // 10.05 XLM
    /// let memo = Memo::text("invoice #42").unwrap();
    ///
    /// let intent = PaymentIntent::try_new(
    ///     source.clone(), dest, asset, amount, Some(memo),
    /// ).unwrap();
    ///
    /// assert_eq!(intent.source, source);
    /// assert_eq!(intent.amount, amount);
    /// ```
    pub fn try_new(
        source: StellarAddress,
        destination: StellarAddress,
        asset: Asset,
        amount: Amount,
        memo: Option<Memo>,
    ) -> Result<Self, ValidationError> {
        if amount.is_zero() {
            return Err(ValidationError::ZeroAmount);
        }

        if let Asset::Credit { ref code, .. } = asset {
            if code.is_empty()
                || code.len() > 12
                || !code.chars().all(|c| c.is_ascii_alphanumeric())
            {
                return Err(ValidationError::InvalidAsset(format!(
                    "Asset code must be 1-12 alphanumeric characters, got '{code}'"
                )));
            }
        }

        if let Some(Memo::Text(ref text)) = memo {
            if text.len() > 28 {
                return Err(ValidationError::InvalidMemo(format!(
                    "Text memo must be at most 28 bytes, got {}",
                    text.len()
                )));
            }
        }

        Ok(Self {
            source,
            destination,
            asset,
            amount,
            memo,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper: build a valid SEP-23 Ed25519 address from seed bytes

    fn make_addr(seed: u8) -> StellarAddress {
        // Build a valid SEP-23 Ed25519 address from seed bytes
        // Version byte 0x30 (Ed25519), 32 seed bytes all set to `seed`
        let mut payload = vec![0x30]; // version byte
        payload.extend(std::iter::repeat_n(seed, 32));
        // Compute CRC16-XMODEM checksum (little-endian, matching SEP-23 parser)
        let checksum = crc16_xmodem(&payload);
        payload.push((checksum & 0xFF) as u8);
        payload.push((checksum >> 8) as u8);
        // Encode as base32
        let encoded = base32_encode(&payload);
        encoded.parse().unwrap()
    }

    fn crc16_xmodem(data: &[u8]) -> u16 {
        let mut crc: u16 = 0;
        for &byte in data {
            crc ^= (byte as u16) << 8;
            for _ in 0..8 {
                if crc & 0x8000 != 0 {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc <<= 1;
                }
            }
        }
        crc
    }

    fn base32_encode(data: &[u8]) -> String {
        const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let mut result = String::new();
        let mut buffer: u32 = 0;
        let mut bits_left: i32 = 0;
        for &byte in data {
            buffer = (buffer << 8) | (byte as u32);
            bits_left += 8;
            while bits_left >= 5 {
                bits_left -= 5;
                result.push(ALPHABET[((buffer >> bits_left) & 0x1F) as usize] as char);
            }
        }
        if bits_left > 0 {
            result.push(ALPHABET[((buffer << (5 - bits_left)) & 0x1F) as usize] as char);
        }
        result
    }

    #[test]
    fn test_try_new_valid() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Native;
        let amount = Amount::from_stroops(1_000_000).unwrap(); // 0.1 XLM
        let memo = Memo::text("test payment").unwrap();

        let intent = PaymentIntent::try_new(
            source.clone(),
            dest.clone(),
            asset.clone(),
            amount,
            Some(memo),
        )
        .unwrap();

        assert_eq!(intent.source, source);
        assert_eq!(intent.destination, dest);
        assert_eq!(intent.asset, asset);
        assert_eq!(intent.amount, amount);
    }

    #[test]
    fn test_try_new_zero_amount_rejected() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Native;
        let amount = Amount::from_stroops(0).unwrap();

        let result = PaymentIntent::try_new(source, dest, asset, amount, None);
        assert!(matches!(result, Err(ValidationError::ZeroAmount)));
        assert_eq!(result.unwrap_err().to_string(), "Amount must not be zero");
    }

    #[test]
    fn test_try_new_overlength_text_memo_rejected() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Native;
        let amount = Amount::from_stroops(100_000).unwrap();
        let overlength = Memo::Text("x".repeat(29)); // 29 bytes — over limit

        let result = PaymentIntent::try_new(source, dest, asset, amount, Some(overlength));
        assert!(matches!(result, Err(ValidationError::InvalidMemo(_))));
    }

    #[test]
    fn test_try_new_exact_28_byte_memo_accepted() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Native;
        let amount = Amount::from_stroops(100_000).unwrap();
        let memo_28 = Memo::text("x".repeat(28)).unwrap(); // exactly 28 bytes

        let result = PaymentIntent::try_new(source, dest, asset, amount, Some(memo_28));
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_new_self_payment_permitted() {
        let addr = make_addr(0x01);
        let asset = Asset::Native;
        let amount = Amount::from_stroops(100_000).unwrap();

        let result = PaymentIntent::try_new(addr.clone(), addr.clone(), asset, amount, None);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().source, addr);
    }

    #[test]
    fn test_try_new_id_memo_always_accepted() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Native;
        let amount = Amount::from_stroops(100_000).unwrap();
        let memo = Memo::Id(u64::MAX);

        let result = PaymentIntent::try_new(source, dest, asset, amount, Some(memo));
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_new_none_memo_accepted() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Native;
        let amount = Amount::from_stroops(100_000).unwrap();

        let result = PaymentIntent::try_new(source, dest, asset, amount, None);
        assert!(result.is_ok());
    }

    #[test]
    fn test_try_new_credit_asset() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Credit {
            code: "USDC".to_string(),
            issuer: make_addr(0x03),
        };
        let amount = Amount::from_stroops(1_000_000_000).unwrap(); // 100.0 USDC

        let result = PaymentIntent::try_new(source, dest, asset, amount, None);
        assert!(result.is_ok());
    }

    #[test]
    fn test_payment_intent_round_trip_json() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Credit {
            code: "USDC".to_string(),
            issuer: make_addr(0x03),
        };
        let amount = Amount::from_stroops(100_500_000).unwrap();
        let memo = Memo::text("invoice #42").unwrap();

        let intent = PaymentIntent::try_new(source, dest, asset, amount, Some(memo)).unwrap();

        let json = serde_json::to_string(&intent).unwrap();
        let deserialized: PaymentIntent = serde_json::from_str(&json).unwrap();

        assert_eq!(intent, deserialized);
    }

    #[test]
    fn test_payment_intent_json_omits_none_memo() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Native;
        let amount = Amount::from_stroops(100_000).unwrap();

        let intent = PaymentIntent::try_new(source, dest, asset, amount, None).unwrap();
        let json = serde_json::to_string(&intent).unwrap();

        assert!(!json.contains("memo"));
    }

    #[test]
    fn test_zero_amount_error_code() {
        let err = ValidationError::ZeroAmount;
        assert_eq!(err.code(), "ZERO_AMOUNT");
    }

    #[test]
    fn test_invalid_memo_error_code() {
        let err = ValidationError::InvalidMemo("too long".to_string());
        assert_eq!(err.code(), "INVALID_MEMO");
    }

    #[test]
    fn test_try_new_empty_asset_code_rejected() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Credit {
            code: String::new(),
            issuer: make_addr(0x03),
        };
        let amount = Amount::from_stroops(100_000).unwrap();

        let result = PaymentIntent::try_new(source, dest, asset, amount, None);
        assert!(matches!(result, Err(ValidationError::InvalidAsset(_))));
    }

    #[test]
    fn test_try_new_long_asset_code_rejected() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Credit {
            code: "TOOLONGCODEXXXX".to_string(),
            issuer: make_addr(0x03),
        };
        let amount = Amount::from_stroops(100_000).unwrap();

        let result = PaymentIntent::try_new(source, dest, asset, amount, None);
        assert!(matches!(result, Err(ValidationError::InvalidAsset(_))));
    }

    #[test]
    fn test_try_new_non_alphanumeric_asset_code_rejected() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Credit {
            code: "US-DC!".to_string(),
            issuer: make_addr(0x03),
        };
        let amount = Amount::from_stroops(100_000).unwrap();

        let result = PaymentIntent::try_new(source, dest, asset, amount, None);
        assert!(matches!(result, Err(ValidationError::InvalidAsset(_))));
    }

    #[test]
    fn test_try_new_valid_12_char_asset_code_accepted() {
        let source = make_addr(0x01);
        let dest = make_addr(0x02);
        let asset = Asset::Credit {
            code: "ABCDEFGHIJKL".to_string(),
            issuer: make_addr(0x03),
        };
        let amount = Amount::from_stroops(100_000).unwrap();

        let result = PaymentIntent::try_new(source, dest, asset, amount, None);
        assert!(result.is_ok());
    }

    #[test]
    fn test_invalid_asset_error_code() {
        let err = ValidationError::InvalidAsset("bad".to_string());
        assert_eq!(err.code(), "INVALID_ASSET");
    }

    #[test]
    fn test_payment_intent_deserialize_rejects_invalid_amount() {
        let json = r#"{
            "source": "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            "destination": "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            "asset": {"Native": null},
            "amount": "99999999999999999999"
        }"#;
        let result: Result<PaymentIntent, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_payment_intent_deserialize_rejects_invalid_address() {
        let json = r#"{
            "source": "not-valid",
            "destination": "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            "asset": {"Native": null},
            "amount": "1.0000000"
        }"#;
        let result: Result<PaymentIntent, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }
}
