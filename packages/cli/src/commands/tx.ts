import { Command } from "commander";

export const txCommand = new Command("tx")
  .description("Explain a Stellar transaction")
  .argument("<hash>", "Transaction hash")
  .action(async (hash: string) => {
    const baseUrl = process.env["STELLAR_EXPLAIN_URL"] ?? "http://localhost:4000";
    const res = await fetch(`${baseUrl}/tx/${hash}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  });
