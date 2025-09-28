use actix_web::{get, web, HttpResponse};
use crate::services::horizon_parser::{parse_transaction, parse_operation};

#[get("/tx/{hash}")]
async fn get_transaction(hash: web::Path<String>) -> HttpResponse {
    // Normally you'd fetch from Horizon API here
    // For now, assume we have a JSON response (mocked)
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
            println!("Parsed Transaction: {:?}", tx);

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
                println!("Parsed Operation: {}", op_log);
            }

            HttpResponse::Ok().json(tx)
        }
        Err(e) => HttpResponse::InternalServerError().body(format!("Parse error: {}", e)),
    }
}
