import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const MAN_CONTENT = `.TH STELLAR-EXPLAIN 1 "2024" "stellar-explain" "User Commands"
.SH NAME
stellar-explain \- explain Stellar blockchain transactions and accounts
.SH SYNOPSIS
.B stellar-explain
[IOPTIONSR] <address|tx-hash>
.SH DESCRIPTION
Fetches and explains Stellar transactions, accounts, and related data
from the Stellar network.
.SH OPTIONS
.TP
.B \-\-json
Output raw JSON instead of formatted text.
.TP
.B \-\-quiet, \-q
Suppress non-essential output.
.TP
.B \-\-timeout <seconds>
Request timeout in seconds (default: 10).
.SH EXAMPLES
.nf
stellar-explain GABC...XYZ
stellar-explain --json abc123txhash
.fi
.SH AUTHOR
StellarCommons contributors
`;

const outDir = join(__dirname, "..", "man");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "stellar-explain.1");
writeFileSync(outFile, MAN_CONTENT);
console.log(`Man page written to ${outFile}`);
