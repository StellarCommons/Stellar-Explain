use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    Internal(String),
    InvalidInput(String),
    HorizonError,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            AppError::NotFound(msg) => {
                let body = Json(ErrorResponse { error: msg });
                (StatusCode::NOT_FOUND, body).into_response()
            }
            AppError::Internal(msg) => {
                let body = Json(ErrorResponse { error: msg });
                (StatusCode::INTERNAL_SERVER_ERROR, body).into_response()
            }
            AppError::InvalidInput(msg) => {
                let body = Json(ErrorResponse {
                    error: format!("Invalid Transaction Hash: {msg}"),
                });
                (StatusCode::BAD_REQUEST, body).into_response()
            }
            AppError::HorizonError => {
                let body = Json(ErrorResponse {
                    error: "The transaction failed when submitted to the stellar network.",
                });
                (StatusCode::BAD_REQUEST, body).into_response()
            }
        }
    }
}
