use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use crate::explain::transaction::ExplainError;


#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct ApiError {
    pub error: ErrorBody,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct ErrorBody {
    pub code: String,
    pub message: String,
}

#[derive(Debug)]
pub enum HorizonError {
    NetworkError,
    TransactionNotFound,
    AccountNotFound,
    InvalidResponse,
}

#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    BadRequest(String),
    UpstreamFailure(String),
    Internal(String),
}

impl AppError {
    fn to_api_error(&self) -> ApiError {
        match self {
            AppError::NotFound(msg) => ApiError {
                error: ErrorBody {
                    code: "NOT_FOUND".into(),
                    message: msg.clone(),
                },
            },
            AppError::BadRequest(msg) => ApiError {
                error: ErrorBody {
                    code: "BAD_REQUEST".into(),
                    message: msg.clone(),
                },
            },
            AppError::UpstreamFailure(msg) => ApiError {
                error: ErrorBody {
                    code: "UPSTREAM_ERROR".into(),
                    message: msg.clone(),
                },
            },
            AppError::Internal(msg) => ApiError {
                error: ErrorBody {
                    code: "INTERNAL_ERROR".into(),
                    message: msg.clone(),
                },
            },
        }
    }

    fn status_code(&self) -> StatusCode {
        match self {
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::UpstreamFailure(_) => StatusCode::BAD_GATEWAY,
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let body = Json(self.to_api_error());
        (status, body).into_response()
    }
}


impl From<HorizonError> for AppError {
    fn from(err: HorizonError) -> Self {
        match err {
            HorizonError::TransactionNotFound => {
                AppError::NotFound(
                    "Transaction not found on the Stellar network.".into(),
                )
            }
            HorizonError::AccountNotFound => {
                AppError::NotFound("Account not found on the Stellar network.".into())
            }
            HorizonError::NetworkError => {
                AppError::UpstreamFailure(
                    "Unable to reach Stellar network. Please try again later."
                        .into(),
                )
            }
            HorizonError::InvalidResponse => {
                AppError::UpstreamFailure(
                    "Received an invalid response from the Stellar network."
                        .into(),
                )
            }
        }
    }
}

impl From for AppError {
    fn from(err: ExplainError) -> Self {
        match err {
            ExplainError::EmptyTransaction => AppError::BadRequest(
                "This transaction contains no operations.".to_string(),
            ),
        }
    }
}


