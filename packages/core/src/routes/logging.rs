use actix_web::{get, web, HttpResponse};
use crate::services::horizon_parser::{parse_transaction, parse_operation};
use tracing::{info, error};

#[get("/tx/{hash}")]
async fn get_transaction(hash: web::Path<String>) -> HttpResponse {
    let tx_hash = hash.into_inner();
    info!(path = %format!("/tx/{}", tx_hash), "Incoming request");

    let mock_json = r#"
    {
        "id": "abcdef12345",
        "successful": true,
        "source_account": "GABC...",
        "fee_charged": "100",
        "operation_count": 1,
        "envelope_xdr": "AAAA..."
    }
    "#;

    match parse_transaction(mock_json) {
        Ok(tx) => {
            info!(status = 200, tx_id = %tx.id, "Transaction parsed successfully");

            // Mock operation JSON
            let mock_op_json = r#"
            {
                "type": "payment",
                "from": "GABC...",
                "to": "GXYZ...",
                "asset_type": "native",
                "amount": "50.0"
            }
            "#;

            if let Some(op_log) = parse_operation(mock_op_json) {
                info!(operation = %op_log, "Operation parsed");
            }

            HttpResponse::Ok().json(tx)
        }
        Err(e) => {
            error!(status = 500, error = %e, "Failed to parse transaction");
            HttpResponse::InternalServerError().body("Failed to parse transaction")
        }
    }
}
