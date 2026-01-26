use crate::models::operation::Operation;

#[derive(Debug, Clone)]
pub struct Transaction {
    pub hash: String,
    pub successful: bool,
    pub fee_charged: u64,
    pub operations: Vec<Operation>,
}

impl Transaction {
    pub fn new(
        hash: String,
        successful: bool,
        fee_charged: u64,
        operations: Vec<Operation>,
    ) -> Self {
        Self {
            hash,
            successful,
            fee_charged,
            operations,
        }
    }
}

