import { Command } from "commander";

export const accountCommand = new Command("account")
  .description("Explain a Stellar account")
  .argument("<address>", "Account address")
  .action(async (address: string) => {
    const baseUrl = process.env["STELLAR_EXPLAIN_URL"] ?? "http://localhost:4000";
    const res = await fetch(`${baseUrl}/account/${address}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  });
