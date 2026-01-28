use reqwest::Client;
use serde::Deserialize;
use crate::config::network::StellarNetwork;

use crate::errors::HorizonError;

#[derive(Debug, Deserialize)]
pub struct HorizonTransaction {
    pub hash: String,
    pub successful: bool,
    pub fee_charged: String,
}

#[derive(Clone)]
pub struct HorizonClient {
    client: Client,
    base_url: String,

}


impl HorizonClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.into(),
        }
    }

    pub fn from_network(network: StellarNetwork) -> Self {
        Self {
            client: Client::new(),
            base_url: network.horizon_url().to_string(),
        }
    }

    pub async fn fetch_transaction(
        &self,
        hash: &str,
    ) -> Result<HorizonTransaction, HorizonError> {
        let url = format!("{}/transactions/{}", self.base_url, hash);

        let res = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|_| HorizonError::NetworkError)?;

        match res.status().as_u16() {
            200 => res
                .json::<HorizonTransaction>()
                .await
                .map_err(|_| HorizonError::InvalidResponse),
            404 => Err(HorizonError::TransactionNotFound),
            _ => Err(HorizonError::InvalidResponse),
        }
    }

    pub async fn fetch_operations(
        &self,
        hash: &str,
    ) -> Result<Vec<HorizonOperation>, HorizonError> {
        let url = format!("{}/transactions/{}/operations", self.base_url, hash);

        let res = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|_| HorizonError::NetworkError)?;

        match res.status().as_u16() {
            200 => {
                let wrapper: HorizonOperationsResponse = res
                    .json()
                    .await
                    .map_err(|_| HorizonError::InvalidResponse)?;
                Ok(wrapper._embedded.records)
            }
            404 => Err(HorizonError::TransactionNotFound),
            _ => Err(HorizonError::InvalidResponse),
        }
    }
}

#[derive(Debug, Deserialize)]
struct HorizonOperationsResponse {
    _embedded: HorizonEmbeddedOperations,
}

#[derive(Debug, Deserialize)]
struct HorizonEmbeddedOperations {
    records: Vec<HorizonOperation>,
}

#[derive(Debug, Deserialize)]
pub struct HorizonOperation {
    pub id: String,
    pub transaction_hash: String,
    #[serde(rename = "type")]
    pub type_i: String,
    // Payment specific fields
    pub from: Option<String>,
    pub to: Option<String>,
    pub asset_type: Option<String>,
    pub asset_code: Option<String>,
    pub asset_issuer: Option<String>,
    pub amount: Option<String>,
}
