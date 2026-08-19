use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;
use thiserror::Error;

// SEP-23 StellarAddress (strkey) validation
// https://github.com/stellar/stellar-protocol/blob/master/core/sep-0023.md

const VERSION_BYTE_ED25519: u8 = 0x30;
const VERSION_BYTE_MUXED: u8 = 0x60;
const STRKEY_LEN: usize = 56;
const CHECKSUM_LEN: usize = 2;

#[derive(Debug, Error)]
pub enum StellarAddressError {
    #[error("Stellar address must be exactly 56 characters, got {0}")]
    WrongLength(usize),
    #[error("Invalid base32 character: '{0}'")]
    InvalidBase32Char(char),
    #[error("Invalid version byte: 0x{0:02X}")]
    InvalidVersionByte(u8),
    #[error("Invalid checksum")]
    InvalidChecksum,
    #[error("Non-zero padding bits in final base32 symbol")]
    NonZeroPaddingBits,
    #[error("Muxed accounts (M...) are not supported")]
    MuxedAccount,
}

impl StellarAddressError {
    /// Returns a stable machine-readable code for this error variant.
    pub fn code(&self) -> &'static str {
        match self {
            StellarAddressError::WrongLength(_) => "INVALID_ADDRESS_LENGTH",
            StellarAddressError::InvalidBase32Char(_) => "INVALID_ADDRESS_CHARS",
            StellarAddressError::InvalidVersionByte(_) => "INVALID_ADDRESS_VERSION",
            StellarAddressError::InvalidChecksum => "INVALID_ADDRESS_CHECKSUM",
            StellarAddressError::NonZeroPaddingBits => "INVALID_ADDRESS_PADDING",
            StellarAddressError::MuxedAccount => "MUXED_ACCOUNT_UNSUPPORTED",
        }
    }
}

/// A validated Stellar Ed25519 public-key strkey (`G...`).
///
/// Implements SEP-23 strkey decoding:
/// - Base32 (RFC4648, no padding) encoded
/// - Version byte `0x30` for Ed25519
/// - CRC16-XMODEM checksum over version + payload
/// - 56 characters total
/// - Muxed accounts (`M...`) are rejected
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct StellarAddress(String);

impl StellarAddress {
    /// Parse and validate a Stellar address string.
    pub fn parse(s: &str) -> Result<Self, StellarAddressError> {
        if s.len() != STRKEY_LEN {
            return Err(StellarAddressError::WrongLength(s.len()));
        }

        let decoded = base32_decode(s)?;

        if decoded.len() < 3 {
            return Err(StellarAddressError::WrongLength(s.len()));
        }

        let version = decoded[0];
        if version == VERSION_BYTE_MUXED {
            return Err(StellarAddressError::MuxedAccount);
        }
        if version != VERSION_BYTE_ED25519 {
            return Err(StellarAddressError::InvalidVersionByte(version));
        }

        let payload_end = decoded.len() - CHECKSUM_LEN;
        let payload = &decoded[..payload_end];
        let given_checksum = &decoded[payload_end..];

        // CRC16-XMODEM over version + payload
        let computed = crc16_xmodem(payload);
        let given = u16::from_le_bytes([given_checksum[0], given_checksum[1]]);

        if computed != given {
            return Err(StellarAddressError::InvalidChecksum);
        }

        Ok(StellarAddress(s.to_string()))
    }

    /// Returns the inner string reference.
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for StellarAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl FromStr for StellarAddress {
    type Err = StellarAddressError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::parse(s)
    }
}

// Base32 encoding/decoding per RFC 4648 (no padding)

const BASE32_ALPHABET: &[u8; 32] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

fn base32_decode(s: &str) -> Result<Vec<u8>, StellarAddressError> {
    let mut bits: u32 = 0;
    let mut bit_count: u32 = 0;
    let mut result = Vec::with_capacity((s.len() * 5) / 8);

    for c in s.chars() {
        if !c.is_ascii() {
            return Err(StellarAddressError::InvalidBase32Char(c));
        }
        let val = BASE32_ALPHABET
            .iter()
            .position(|&b| b == c as u8)
            .ok_or(StellarAddressError::InvalidBase32Char(c))? as u32;

        bits = (bits << 5) | val;
        bit_count += 5;

        if bit_count >= 8 {
            bit_count -= 8;
            result.push((bits >> bit_count) as u8);
        }
    }

    // SEP-23: reject non-zero padding bits in the final symbol
    if bit_count > 0 && (bits & ((1 << bit_count) - 1)) != 0 {
        return Err(StellarAddressError::NonZeroPaddingBits);
    }

    Ok(result)
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

// ─── Asset ───────────────────────────────────────────────────────────────

/// A Stellar asset — either native XLM or a credit asset with code + issuer.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Asset {
    Native,
    Credit {
        code: String,
        issuer: StellarAddress,
    },
}

impl Asset {
    /// Create a credit (non-native) asset.
    pub fn credit(code: impl Into<String>, issuer: StellarAddress) -> Self {
        Asset::Credit {
            code: code.into(),
            issuer,
        }
    }

    /// Build an `Asset` from Horizon's separate type/code/issuer fields.
    ///
    /// Returns `"XLM (native)"`-style output when the type is `"native"` or missing.
    /// Falls back to `None` when issuer is absent (e.g. unlisted credit asset from Horizon).
    pub fn from_horizon_fields(
        asset_type: Option<&str>,
        asset_code: Option<&str>,
        asset_issuer: Option<&str>,
    ) -> Option<Self> {
        match asset_type {
            Some("native") | None => Some(Asset::Native),
            _ => {
                let code = asset_code?.to_string();
                let issuer_str = asset_issuer?;
                let issuer = StellarAddress::parse(issuer_str).ok()?;
                Some(Asset::Credit { code, issuer })
            }
        }
    }

    /// Format the asset for display.
    ///
    /// Produces output identical to the pre-existing `format_asset` implementations
    /// in `models/operation.rs` and `explain/operation/payment.rs`:
    /// - Native → `"XLM (native)"`
    /// - Credit → `"CODE (ISSUER)"`
    pub fn format(&self) -> String {
        match self {
            Asset::Native => "XLM (native)".to_string(),
            Asset::Credit { code, issuer } => format!("{code} ({issuer})"),
        }
    }
}

impl fmt::Display for Asset {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.format())
    }
}

// ─── Amount ──────────────────────────────────────────────────────────────

/// A payment-amount-scoped type wrapping Stellar stroops (integers).
///
/// **Not** a universal replacement for every Stellar numeric field:
/// - Offer prices are ratios, not absolute amounts.
/// - Trustline `limit` carries a special "unlimited" sentinel (`922337203685.4775807`)
///   that collides with the numeric max; using `Amount` for trustline limits
///   without re-examining that collision is a bug.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct Amount(u64);

/// Maximum stroops value: `922337203685.4775807` (i64::MAX in stroops).
pub const AMOUNT_MAX_STROOPS: u64 = 9_223_372_036_854_775_807;

#[derive(Debug, Error)]
pub enum AmountError {
    #[error("Amount is not numeric: '{0}'")]
    NotNumeric(String),
    #[error("Amount must not be negative")]
    Negative,
    #[error("Amount has too many fractional digits (max 7, got {0})")]
    TooManyFractionalDigits(usize),
    #[error("Amount exceeds maximum: 922337203685.4775807")]
    Overflow,
    #[error("Amount cannot be empty")]
    Empty,
}

impl Amount {
    /// Create an `Amount` directly from stroops. Returns `None` on overflow.
    pub fn from_stroops(stroops: u64) -> Option<Self> {
        if stroops <= AMOUNT_MAX_STROOPS {
            Some(Amount(stroops))
        } else {
            None
        }
    }

    /// Returns the raw stroops value.
    pub fn stroops(&self) -> u64 {
        self.0
    }

    /// Checked addition. Returns `None` on overflow.
    pub fn checked_add(self, other: Amount) -> Option<Amount> {
        self.0.checked_add(other.0).and_then(Amount::from_stroops)
    }

    /// Checked subtraction. Returns `None` on underflow.
    pub fn checked_sub(self, other: Amount) -> Option<Amount> {
        self.0.checked_sub(other.0).map(Amount)
    }

    /// Whether the amount is zero.
    pub fn is_zero(&self) -> bool {
        self.0 == 0
    }
}

impl fmt::Display for Amount {
    /// Format as a 7-decimal string via integer division/remainder.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let integer = self.0 / 10_000_000;
        let frac = self.0 % 10_000_000;
        write!(f, "{integer}.{frac:07}")
    }
}

impl FromStr for Amount {
    type Err = AmountError;

    /// Parse Horizon's decimal-string amounts.
    ///
    /// Rejects: non-numeric, negative, >7 fractional digits, values above `922337203685.4775807`.
    /// Uses integer string manipulation (no float conversion).
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s.is_empty() {
            return Err(AmountError::Empty);
        }

        let negative = s.starts_with('-');
        let s = if negative || s.starts_with('+') {
            &s[1..]
        } else {
            s
        };

        if s.is_empty() || s.starts_with('-') || s.starts_with('+') {
            return Err(AmountError::NotNumeric(s.to_string()));
        }

        let (int_part, frac_part) = match s.find('.') {
            Some(pos) => (&s[..pos], &s[pos + 1..]),
            None => (s, ""),
        };

        if int_part.is_empty() && frac_part.is_empty() {
            return Err(AmountError::NotNumeric(s.to_string()));
        }

        // Reject leading zeros unless the integer part is exactly "0"
        if int_part.len() > 1 && int_part.starts_with('0') {
            return Err(AmountError::NotNumeric(s.to_string()));
        }

        if frac_part.len() > 7 {
            return Err(AmountError::TooManyFractionalDigits(frac_part.len()));
        }

        // Must all be digits
        if !int_part.chars().all(|c| c.is_ascii_digit()) {
            return Err(AmountError::NotNumeric(s.to_string()));
        }
        if !frac_part.chars().all(|c| c.is_ascii_digit()) {
            return Err(AmountError::NotNumeric(s.to_string()));
        }

        // Convert integer part to u64
        let int_val: u64 = if int_part.is_empty() {
            0
        } else {
            int_part.parse::<u64>().map_err(|_| AmountError::Overflow)?
        };

        // Convert fractional part to stroops (pad to 7 digits)
        let frac_padded = format!("{frac_part:0<7}");
        let frac_val: u64 = frac_padded
            .parse::<u64>()
            .map_err(|_| AmountError::Overflow)?;

        let stroops = int_val
            .checked_mul(10_000_000)
            .and_then(|v| v.checked_add(frac_val))
            .ok_or(AmountError::Overflow)?;

        if negative {
            return Err(AmountError::Negative);
        }

        if stroops > AMOUNT_MAX_STROOPS {
            return Err(AmountError::Overflow);
        }

        Ok(Amount(stroops))
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper: generate a valid SEP-23 address from a 32-byte payload.
    fn make_valid_address(payload: &[u8; 32]) -> String {
        let mut data = vec![VERSION_BYTE_ED25519];
        data.extend_from_slice(payload);
        let checksum = crc16_xmodem(&data);
        data.extend_from_slice(&checksum.to_le_bytes());
        base32_encode(&data)
    }

    fn base32_encode(data: &[u8]) -> String {
        let mut result = String::new();
        let mut bits: u32 = 0;
        let mut bit_count: u32 = 0;
        for &byte in data {
            bits = (bits << 8) | (byte as u32);
            bit_count += 8;
            while bit_count >= 5 {
                bit_count -= 5;
                let idx = ((bits >> bit_count) & 0x1F) as usize;
                result.push(BASE32_ALPHABET[idx] as char);
            }
        }
        if bit_count > 0 {
            let idx = ((bits << (5 - bit_count)) & 0x1F) as usize;
            result.push(BASE32_ALPHABET[idx] as char);
        }
        result
    }

    fn valid_addr() -> String {
        make_valid_address(&[1u8; 32])
    }

    fn valid_addr2() -> String {
        make_valid_address(&[42u8; 32])
    }

    // ── StellarAddress tests ────────────────────────────────────────────

    #[test]
    fn test_parse_valid_address() {
        let addr = valid_addr();
        assert!(StellarAddress::parse(&addr).is_ok());
    }

    #[test]
    fn test_parse_preserves_original_string() {
        let addr = valid_addr();
        let parsed = StellarAddress::parse(&addr).unwrap();
        assert_eq!(parsed.as_str(), addr);
    }

    #[test]
    fn test_wrong_length_too_short() {
        let result = StellarAddress::parse("GSHORT");
        assert!(matches!(result, Err(StellarAddressError::WrongLength(6))));
    }

    #[test]
    fn test_wrong_length_too_long() {
        let result = StellarAddress::parse(&"G".repeat(57));
        assert!(matches!(result, Err(StellarAddressError::WrongLength(57))));
    }

    #[test]
    fn test_invalid_version_byte_muxed() {
        let addr = valid_addr();
        let mut chars: Vec<char> = addr.chars().collect();
        chars[0] = 'M';
        let muxed: String = chars.into_iter().collect();
        let result = StellarAddress::parse(&muxed);
        assert!(matches!(result, Err(StellarAddressError::MuxedAccount)));
    }

    #[test]
    fn test_muxed_account_error_code() {
        let err = StellarAddressError::MuxedAccount;
        assert_eq!(err.code(), "MUXED_ACCOUNT_UNSUPPORTED");
    }

    #[test]
    fn test_corrupted_checksum_rejected() {
        let addr = valid_addr();
        let mut chars: Vec<char> = addr.chars().collect();
        let last = chars[55];
        chars[55] = if last == 'A' { 'B' } else { 'A' };
        let corrupted: String = chars.into_iter().collect();
        let result = StellarAddress::parse(&corrupted);
        assert!(matches!(result, Err(StellarAddressError::InvalidChecksum)));
    }

    #[test]
    fn test_invalid_base32_character() {
        let addr = valid_addr();
        let mut chars: Vec<char> = addr.chars().collect();
        chars[10] = '1'; // '1' is not in base32 alphabet
        let bad: String = chars.into_iter().collect();
        let result = StellarAddress::parse(&bad);
        assert!(matches!(
            result,
            Err(StellarAddressError::InvalidBase32Char('1'))
        ));
    }

    #[test]
    fn test_non_ascii_character_rejected() {
        // 'Ł' (U+0141) is 2 UTF-8 bytes — test base32_decode directly to avoid
        // the byte-length check in parse() catching WrongLength first
        let result = base32_decode("ABCŁEFGHJ");
        assert!(matches!(
            result,
            Err(StellarAddressError::InvalidBase32Char('Ł'))
        ));
    }

    #[test]
    fn test_non_zero_padding_bits_rejected() {
        // 9-char input: 9*5 = 45 bits → 5 bytes + 5 leftover bits (non-zero)
        // "ABCDEFGHJ" decodes cleanly but the padding bits are non-zero
        let result = base32_decode("ABCDEFGHJ");
        assert!(matches!(
            result,
            Err(StellarAddressError::NonZeroPaddingBits)
        ));
    }

    #[test]
    fn test_wrong_length_error_code() {
        let err = StellarAddressError::WrongLength(10);
        assert_eq!(err.code(), "INVALID_ADDRESS_LENGTH");
    }

    #[test]
    fn test_display_trait() {
        let addr = valid_addr();
        let parsed = StellarAddress::parse(&addr).unwrap();
        assert_eq!(format!("{parsed}"), addr);
    }

    #[test]
    fn test_from_str_trait() {
        let addr = valid_addr();
        let result: Result<StellarAddress, _> = addr.parse();
        assert!(result.is_ok());
    }

    #[test]
    fn test_clone_and_eq() {
        let addr = valid_addr();
        let a = StellarAddress::parse(&addr).unwrap();
        let b = a.clone();
        assert_eq!(a, b);
    }

    #[test]
    fn test_two_different_addresses_are_not_equal() {
        let a = StellarAddress::parse(&valid_addr()).unwrap();
        let b = StellarAddress::parse(&valid_addr2()).unwrap();
        assert_ne!(a, b);
    }

    // ── Amount tests ────────────────────────────────────────────────────

    #[test]
    fn test_amount_parse_whole() {
        let amt: Amount = "100".parse().unwrap();
        assert_eq!(amt.stroops(), 1_000_000_000);
        assert_eq!(amt.to_string(), "100.0000000");
    }

    #[test]
    fn test_amount_parse_with_fractional() {
        let amt: Amount = "100.5000000".parse().unwrap();
        assert_eq!(amt.stroops(), 1_005_000_000);
        assert_eq!(amt.to_string(), "100.5000000");
    }

    #[test]
    fn test_amount_parse_min_value() {
        let amt: Amount = "0.0000001".parse().unwrap();
        assert_eq!(amt.stroops(), 1);
        assert_eq!(amt.to_string(), "0.0000001");
    }

    #[test]
    fn test_amount_parse_max_value() {
        let amt: Amount = "922337203685.4775807".parse().unwrap();
        assert_eq!(amt.stroops(), AMOUNT_MAX_STROOPS);
        assert_eq!(amt.to_string(), "922337203685.4775807");
    }

    #[test]
    fn test_amount_parse_zero() {
        let amt: Amount = "0".parse().unwrap();
        assert_eq!(amt.stroops(), 0);
        assert!(amt.is_zero());
        assert_eq!(amt.to_string(), "0.0000000");
    }

    #[test]
    fn test_amount_rejects_negative() {
        assert!(matches!("-1".parse::<Amount>(), Err(AmountError::Negative)));
    }

    #[test]
    fn test_amount_rejects_negative_zero() {
        assert!(matches!("-0".parse::<Amount>(), Err(AmountError::Negative)));
        assert!(matches!(
            "-0.0000000".parse::<Amount>(),
            Err(AmountError::Negative)
        ));
    }

    #[test]
    fn test_amount_rejects_repeated_signs() {
        assert!(matches!(
            "++5".parse::<Amount>(),
            Err(AmountError::NotNumeric(_))
        ));
        assert!(matches!(
            "+-5".parse::<Amount>(),
            Err(AmountError::NotNumeric(_))
        ));
        assert!(matches!(
            "+".parse::<Amount>(),
            Err(AmountError::NotNumeric(_))
        ));
        assert!(matches!(
            "-".parse::<Amount>(),
            Err(AmountError::NotNumeric(_))
        ));
    }

    #[test]
    fn test_amount_rejects_eight_fractional_digits() {
        assert!(matches!(
            "1.00000001".parse::<Amount>(),
            Err(AmountError::TooManyFractionalDigits(8))
        ));
    }

    #[test]
    fn test_amount_rejects_overflow() {
        assert!(matches!(
            "922337203685.4775808".parse::<Amount>(),
            Err(AmountError::Overflow)
        ));
    }

    #[test]
    fn test_amount_rejects_empty() {
        assert!(matches!("".parse::<Amount>(), Err(AmountError::Empty)));
    }

    #[test]
    fn test_amount_rejects_non_numeric() {
        assert!(matches!(
            "abc".parse::<Amount>(),
            Err(AmountError::NotNumeric(_))
        ));
    }

    #[test]
    fn test_amount_rejects_leading_zeros() {
        assert!(matches!(
            "01.0000000".parse::<Amount>(),
            Err(AmountError::NotNumeric(_))
        ));
    }

    #[test]
    fn test_amount_ordering() {
        let a: Amount = "100.0000000".parse().unwrap();
        let b: Amount = "200.0000000".parse().unwrap();
        assert!(a < b);
        assert!(b > a);
    }

    #[test]
    fn test_amount_checked_add() {
        let a: Amount = "100.0000000".parse().unwrap();
        let b: Amount = "200.0000000".parse().unwrap();
        let sum = a.checked_add(b).unwrap();
        assert_eq!(sum, Amount::from_stroops(3_000_000_000).unwrap());
    }

    #[test]
    fn test_amount_checked_add_overflow() {
        let a: Amount = "922337203685.4775807".parse().unwrap();
        let b: Amount = "0.0000001".parse().unwrap();
        assert!(a.checked_add(b).is_none());
    }

    #[test]
    fn test_amount_checked_sub() {
        let a: Amount = "300.0000000".parse().unwrap();
        let b: Amount = "100.0000000".parse().unwrap();
        let diff = a.checked_sub(b).unwrap();
        assert_eq!(diff, Amount::from_stroops(2_000_000_000).unwrap());
    }

    #[test]
    fn test_amount_checked_sub_underflow() {
        let a: Amount = "100.0000000".parse().unwrap();
        let b: Amount = "200.0000000".parse().unwrap();
        assert!(a.checked_sub(b).is_none());
    }

    #[test]
    fn test_amount_is_zero() {
        let zero: Amount = "0".parse().unwrap();
        let nonzero: Amount = "0.0000001".parse().unwrap();
        assert!(zero.is_zero());
        assert!(!nonzero.is_zero());
    }

    #[test]
    fn test_amount_from_stroops() {
        let amt = Amount::from_stroops(1_000_000).unwrap();
        assert_eq!(amt.stroops(), 1_000_000);
        assert_eq!(amt.to_string(), "0.1000000");
    }

    #[test]
    fn test_amount_from_stroops_overflow() {
        assert!(Amount::from_stroops(AMOUNT_MAX_STROOPS + 1).is_none());
    }

    // ── Asset tests ─────────────────────────────────────────────────────

    #[test]
    fn test_asset_native_display() {
        assert_eq!(Asset::Native.format(), "XLM (native)");
        assert_eq!(Asset::Native.to_string(), "XLM (native)");
    }

    #[test]
    fn test_asset_credit_display() {
        let issuer = StellarAddress::parse(&valid_addr()).unwrap();
        let asset = Asset::credit("USDC", issuer.clone());
        assert_eq!(asset.format(), format!("USDC ({})", valid_addr()));
        assert_eq!(asset.to_string(), format!("USDC ({})", valid_addr()));
    }

    #[test]
    fn test_asset_credit_constructor() {
        let addr = valid_addr();
        let issuer = StellarAddress::parse(&addr).unwrap();
        let asset = Asset::credit("BTC", issuer);
        match asset {
            Asset::Credit { code, issuer } => {
                assert_eq!(code, "BTC");
                assert_eq!(issuer.as_str(), &addr);
            }
            _ => panic!("Expected Credit variant"),
        }
    }

    #[test]
    fn test_asset_clone_and_eq() {
        let issuer = StellarAddress::parse(&valid_addr()).unwrap();
        let a = Asset::credit("USDC", issuer);
        let b = a.clone();
        assert_eq!(a, b);
    }

    #[test]
    fn test_asset_format_matches_operation_rs() {
        let result = Asset::Native.format();
        assert_eq!(result, "XLM (native)");
    }

    #[test]
    fn test_asset_format_credit_matches_operation_rs() {
        let issuer = StellarAddress::parse(&valid_addr()).unwrap();
        let asset = Asset::credit("USDC", issuer);
        assert_eq!(asset.format(), format!("USDC ({})", valid_addr()));
    }
}
