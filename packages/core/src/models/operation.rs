use crate::services::horizon::HorizonOperation;

#[derive(Debug, Clone)]
pub enum Operation {
    Payment(PaymentOperation),
    Unsupported,
}

#[derive(Debug, Clone)]
pub struct PaymentOperation {
    pub from: String,
    pub to: String,
    pub asset: Asset,
    pub amount: String,
}

#[derive(Debug, Clone)]
pub enum Asset {
    Native,
    Credit { code: String, issuer: String },
}

impl From<HorizonOperation> for Operation {
    fn from(op: HorizonOperation) -> Self {
        match op.op_type.as_str() {
            "payment" => {
                let asset = match op.asset_type.as_deref() {
                    Some("native") => Asset::Native,
                    Some(_) => Asset::Credit {
                        code: op.asset_code.unwrap_or_default(),
                        issuer: op.asset_issuer.unwrap_or_default(),
                    },
                    None => Asset::Native,
                };

                Operation::Payment(PaymentOperation {
                    from: op.from.unwrap_or_default(),
                    to: op.to.unwrap_or_default(),
                    asset,
                    amount: op.amount.unwrap_or_default(),
                })
            }
            _ => Operation::Unsupported,
        }
    }
}
