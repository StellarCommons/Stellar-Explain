use clap::{Parser, Subcommand};
use std::process;

#[derive(Parser)]
#[command(name = "stellar-explain")]
#[command(author = "Stellar Commons")]
#[command(version = "1.0")]
#[command(about = "CLI tool to explain Stellar blockchain transactions and accounts", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Explain a Stellar transaction by its hash
    Tx {
        /// Transaction hash to explain
        hash: String,
        
        /// Output format (text, json)
        #[arg(short, long, default_value = "text")]
        format: String,
    },
    /// Get account summary by account ID
    Account {
        /// Stellar account ID (public key)
        id: String,
        
        /// Output format (text, json)
        #[arg(short, long, default_value = "text")]
        format: String,
    },
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Tx { hash, format } => {
            if let Err(e) = explain_transaction(hash, format).await {
                eprintln!("Error explaining transaction: {}", e);
                process::exit(1);
            }
        }
        Commands::Account { id, format } => {
            if let Err(e) = explain_account(id, format).await {
                eprintln!("Error explaining account: {}", e);
                process::exit(1);
            }
        }
    }
}

async fn explain_transaction(hash: &str, format: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("🔍 Fetching transaction: {}", hash);
    println!();

    // TODO: Replace with actual API call to your core service
    // For now, this demonstrates the structure
    let api_url = std::env::var("STELLAR_EXPLAIN_API")
        .unwrap_or_else(|_| "http://localhost:8080".to_string());
    
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/tx/{}", api_url, hash))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(format!("API returned error: {}", response.status()).into());
    }

    let data: serde_json::Value = response.json().await?;

    match format {
        "json" => {
            println!("{}", serde_json::to_string_pretty(&data)?);
        }
        "text" | _ => {
            print_transaction_text(&data);
        }
    }

    Ok(())
}

async fn explain_account(id: &str, format: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("🔍 Fetching account: {}", id);
    println!();

    // TODO: Replace with actual API call to your core service
    let api_url = std::env::var("STELLAR_EXPLAIN_API")
        .unwrap_or_else(|_| "http://localhost:8080".to_string());
    
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/account/{}", api_url, id))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(format!("API returned error: {}", response.status()).into());
    }

    let data: serde_json::Value = response.json().await?;

    match format {
        "json" => {
            println!("{}", serde_json::to_string_pretty(&data)?);
        }
        "text" | _ => {
            print_account_text(&data);
        }
    }

    Ok(())
}

fn print_transaction_text(data: &serde_json::Value) {
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("📋 TRANSACTION DETAILS");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if let Some(hash) = data.get("hash").and_then(|v| v.as_str()) {
        println!("Hash:        {}", hash);
    }
    
    if let Some(source) = data.get("source").and_then(|v| v.as_str()) {
        println!("Source:      {}", source);
    }
    
    if let Some(timestamp) = data.get("timestamp").and_then(|v| v.as_str()) {
        println!("Time:        {}", timestamp);
    }
    
    if let Some(status) = data.get("status").and_then(|v| v.as_str()) {
        println!("Status:      {}", status);
    }
    
    println!();
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("📝 OPERATIONS");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if let Some(operations) = data.get("operations").and_then(|v| v.as_array()) {
        for (i, op) in operations.iter().enumerate() {
            println!("\n{}. {}", i + 1, 
                op.get("type").and_then(|v| v.as_str()).unwrap_or("Unknown"));
            
            if let Some(description) = op.get("description").and_then(|v| v.as_str()) {
                println!("   {}", description);
            }
            
            if let Some(amount) = op.get("amount").and_then(|v| v.as_str()) {
                if let Some(asset) = op.get("asset").and_then(|v| v.as_str()) {
                    println!("   Amount: {} {}", amount, asset);
                }
            }
        }
    } else {
        println!("No operations found in response");
    }
    
    println!();
}

fn print_account_text(data: &serde_json::Value) {
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("👤 ACCOUNT SUMMARY");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if let Some(id) = data.get("id").and_then(|v| v.as_str()) {
        println!("Account ID:  {}", id);
    }
    
    if let Some(sequence) = data.get("sequence").and_then(|v| v.as_str()) {
        println!("Sequence:    {}", sequence);
    }
    
    println!();
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("💰 BALANCES");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if let Some(balances) = data.get("balances").and_then(|v| v.as_array()) {
        for balance in balances {
            if let (Some(asset), Some(amount)) = (
                balance.get("asset").and_then(|v| v.as_str()),
                balance.get("balance").and_then(|v| v.as_str())
            ) {
                println!("{:10} {}", asset, amount);
            }
        }
    } else {
        println!("No balance information available");
    }
    
    println!();
    
    if let Some(signers) = data.get("signers").and_then(|v| v.as_array()) {
        if !signers.is_empty() {
            println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            println!("🔐 SIGNERS");
            println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            for (i, signer) in signers.iter().enumerate() {
                if let Some(key) = signer.get("key").and_then(|v| v.as_str()) {
                    let weight = signer.get("weight").and_then(|v| v.as_u64()).unwrap_or(0);
                    println!("{}. {} (weight: {})", i + 1, key, weight);
                }
            }
            println!();
        }
    }
}