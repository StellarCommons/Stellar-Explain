import { execSync } from "child_process";

function getPlatformCmd(text: string): string {
  switch (process.platform) {
    case "darwin": return `echo ${JSON.stringify(text)} | pbcopy`;
    case "win32":  return `echo ${text} | clip`;
    default:       return `echo ${JSON.stringify(text)} | xclip -selection clipboard`;
  }
}

export function copyToClipboard(text: string): void {
  try {
    execSync(getPlatformCmd(text), { stdio: "pipe" });
  } catch {
    throw new Error("Failed to copy to clipboard. Is xclip installed?");
  }
}
