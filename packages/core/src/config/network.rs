use std::env;
#[derive(Debug, Clone, PartialEq)]
pub enum StellarNetwork {
    Public,
    Testnet,
}

impl StellarNetwork {
    pub fn from_env() -> Self {
        match env::var("STELLAR_NETWORK")
            .unwrap_or_else(|_| "public".into())
            .to_lowercase()
            .as_str()
        {
            "testnet" => StellarNetwork::Testnet,
            _ => StellarNetwork::Public,
        }
    }

    pub fn horizon_url(&self) -> &'static str {
        match self {
            StellarNetwork::Public => "https://horizon.stellar.org",
            StellarNetwork::Testnet => "https://horizon-testnet.stellar.org",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_to_public_network() {
    unsafe {
        std::env::remove_var("STELLAR_NETWORK");
    }       
     assert_eq!(StellarNetwork::from_env(), StellarNetwork::Public);
    }

    #[test]
    fn resolves_testnet_network() {
    unsafe {
        std::env::set_var("STELLAR_NETWORK", "testnet");
    }       
     assert_eq!(StellarNetwork::from_env(), StellarNetwork::Testnet);
    }

    #[test]
    fn public_network_url() {
        let net = StellarNetwork::Public;
        assert_eq!(net.horizon_url(), "https://horizon.stellar.org");
    }

    #[test]
    fn testnet_network_url() {
        let net = StellarNetwork::Testnet;
        assert_eq!(
            net.horizon_url(),
            "https://horizon-testnet.stellar.org"
        );
    }
}
