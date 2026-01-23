use thiserror::Error;

#[derive(Debug, Error)]
pub enum HorizonError {
    #[error("transaction not found")]
    TransactionNotFound,

    #[error("failed to reach Horizon")]
    NetworkError,

    #[error("unexpected Horizon response")]
    InvalidResponse,
}
