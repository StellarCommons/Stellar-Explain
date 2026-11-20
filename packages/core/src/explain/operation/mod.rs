//! Operation explanation logic.
//!
//! Each operation type gets its own submodule.

pub mod account_merge;
pub mod change_trust;
pub mod claimable_balance;
pub mod clawback;
pub mod create_account;
pub(crate) mod format;
pub mod manage_offer;
pub mod path_payment;
pub mod payment;
pub mod set_options;
pub mod sponsorship;
