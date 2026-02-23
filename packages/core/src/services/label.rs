pub fn resolve_label(address: &str) -> Option<&'static str> {
    let normalized = address.trim().to_ascii_uppercase();

    match normalized.as_str() {
        
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF" => {
            Some("Stellar Foundation")
        }
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH6H5" => {
            Some("SDF Distribution")
        }
        
        "GBINANCEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" => Some("Binance"),
        "GCOINBASEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" => Some("Coinbase"),
        "GKRAKENAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" => Some("Kraken"),
        "GROBINHOODAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" => Some("Robinhood"),
        "GANCHORAGEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" => Some("Anchorage Digital"),
        
        "GUSDCISSUERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" => {
            Some("USDC Issuer (Circle)")
        }
        "GSTRONGHOLDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" => Some("Stronghold"),
        "GTEMPOEUROAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" => Some("Tempo"),
        "GLOBSTRVAULTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" => Some("LOBSTR Vault"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::resolve_label;

    #[test]
    fn resolves_known_address() {
        let label = resolve_label("GCOINBASEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        assert_eq!(label, Some("Coinbase"));
    }

    #[test]
    fn resolves_case_and_whitespace() {
        let label = resolve_label("  gkrakenaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ");
        assert_eq!(label, Some("Kraken"));
    }

    #[test]
    fn unknown_address_returns_none() {
        let label =
            resolve_label("GUNKNOWNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        assert_eq!(label, None);
    }
}
