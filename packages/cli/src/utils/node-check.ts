const MIN_NODE_MAJOR = 18;

export function checkNodeVersion(): void {
  const version = process.version; // e.g. "v20.11.0"
  const major = parseInt(version.slice(1).split(".")[0], 10);
  if (major < MIN_NODE_MAJOR) {
    process.stderr.write(
      `stellar-explain requires Node.js v${MIN_NODE_MAJOR}+.\n` +
      `You are running ${version}. Please upgrade: https://nodejs.org\n`
    );
    process.exit(1);
  }
}
