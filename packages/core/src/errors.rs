use crate::explain::transaction::ExplainError;
use crate::models::stellar::{AmountError, StellarAddressError};
use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};

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

/// Structured validation-error vocabulary with stable machine-readable codes.
///
/// Each variant maps to a distinct validation failure that a frontend or CLI
/// can react to programmatically instead of string-matching `ErrorBody.message`.
#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("Invalid Stellar address: {0}")]
    InvalidAddress(#[from] StellarAddressError),

    #[error("Invalid amount: {0}")]
    InvalidAmount(#[from] AmountError),

    #[error("Amount must not be zero")]
    ZeroAmount,

    #[error("Invalid asset: {0}")]
    InvalidAsset(String),

    #[error("Invalid memo: {0}")]
    InvalidMemo(String),

    #[error("Invalid payment intent: {0}")]
    InvalidPaymentIntent(String),
}

impl ValidationError {
    /// Returns a stable machine-readable code for this validation failure.
    pub fn code(&self) -> &'static str {
        match self {
            ValidationError::InvalidAddress(e) => e.code(),
            ValidationError::InvalidAmount(e) => match e {
                AmountError::NotNumeric(_) => "INVALID_AMOUNT",
                AmountError::Negative => "INVALID_AMOUNT",
                AmountError::TooManyFractionalDigits(_) => "INVALID_AMOUNT",
                AmountError::Overflow => "INVALID_AMOUNT",
                AmountError::Empty => "INVALID_AMOUNT",
            },
            ValidationError::ZeroAmount => "ZERO_AMOUNT",
            ValidationError::InvalidAsset(_) => "INVALID_ASSET",
            ValidationError::InvalidMemo(_) => "INVALID_MEMO",
            ValidationError::InvalidPaymentIntent(_) => "INVALID_PAYMENT_INTENT",
        }
    }
}

#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    BadRequest(String),
    Validation(ValidationError),
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
            AppError::Validation(err) => ApiError {
                error: ErrorBody {
                    code: err.code().to_string(),
                    message: err.to_string(),
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

    pub fn status_code(&self) -> StatusCode {
        match self {
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::Validation(_) => StatusCode::BAD_REQUEST,
            AppError::UpstreamFailure(_) => StatusCode::BAD_GATEWAY,
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl From<ValidationError> for AppError {
    fn from(err: ValidationError) -> Self {
        AppError::Validation(err)
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
                AppError::NotFound("Transaction not found on the Stellar network.".into())
            }
            HorizonError::AccountNotFound => {
                AppError::NotFound("Account not found on the Stellar network.".into())
            }
            HorizonError::NetworkError => AppError::UpstreamFailure(
                "Unable to reach Stellar network. Please try again later.".into(),
            ),
            HorizonError::InvalidResponse => AppError::UpstreamFailure(
                "Received an invalid response from the Stellar network.".into(),
            ),
        }
    }
}

impl From<ExplainError> for AppError {
    fn from(err: ExplainError) -> Self {
        match err {
            ExplainError::EmptyTransaction => {
                AppError::BadRequest("This transaction contains no operations.".to_string())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_error_invalid_address_code() {
        let err = StellarAddressError::WrongLength(10);
        let validation = ValidationError::InvalidAddress(err);
        assert_eq!(validation.code(), "INVALID_ADDRESS_LENGTH");
    }

    #[test]
    fn test_validation_error_muxed_account_code() {
        let err = StellarAddressError::MuxedAccount;
        let validation = ValidationError::InvalidAddress(err);
        assert_eq!(validation.code(), "MUXED_ACCOUNT_UNSUPPORTED");
    }

    #[test]
    fn test_validation_error_invalid_amount_code() {
        let err = AmountError::NotNumeric("abc".to_string());
        let validation = ValidationError::InvalidAmount(err);
        assert_eq!(validation.code(), "INVALID_AMOUNT");
    }

    #[test]
    fn test_validation_error_zero_amount_code() {
        let validation = ValidationError::ZeroAmount;
        assert_eq!(validation.code(), "ZERO_AMOUNT");
    }

    #[test]
    fn test_validation_error_invalid_asset_code() {
        let validation = ValidationError::InvalidAsset("bad asset".to_string());
        assert_eq!(validation.code(), "INVALID_ASSET");
    }

    #[test]
    fn test_validation_error_invalid_memo_code() {
        let validation = ValidationError::InvalidMemo("too long".to_string());
        assert_eq!(validation.code(), "INVALID_MEMO");
    }

    #[test]
    fn test_validation_error_invalid_payment_intent_code() {
        let validation = ValidationError::InvalidPaymentIntent("multiple issues".to_string());
        assert_eq!(validation.code(), "INVALID_PAYMENT_INTENT");
    }

    #[test]
    fn test_app_error_validation_serializes_to_api_error() {
        let err = AppError::Validation(ValidationError::ZeroAmount);
        let api = err.to_api_error();
        assert_eq!(api.error.code, "ZERO_AMOUNT");
        assert_eq!(api.error.message, "Amount must not be zero");
    }

    #[test]
    fn test_app_error_validation_returns_400() {
        let err = AppError::Validation(ValidationError::ZeroAmount);
        assert_eq!(err.status_code(), StatusCode::BAD_REQUEST);
    }

    #[test]
    fn test_app_error_validation_into_response() {
        let err = AppError::Validation(ValidationError::ZeroAmount);
        let response = err.into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[test]
    fn test_from_validation_error_for_app_error() {
        let validation = ValidationError::ZeroAmount;
        let app_err: AppError = validation.into();
        assert!(matches!(app_err, AppError::Validation(_)));
        assert_eq!(app_err.status_code(), StatusCode::BAD_REQUEST);
    }
}
