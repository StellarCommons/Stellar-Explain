use tracing::info;

pub fn log_transaction_parsing(transaction_id: &str) {
    info!("Parsing transaction: {}", transaction_id);
}
