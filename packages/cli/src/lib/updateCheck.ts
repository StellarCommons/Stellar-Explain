import * as https from "https";

const PACKAGE_NAME = "@stellar-explain/cli";
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;

function fetchLatestVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(REGISTRY_URL, (res) => {
      let data = "";
      res.on("data", (chunk: string) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data) as { version?: string };
          if (parsed.version) resolve(parsed.version);
          else reject(new Error("No version in registry response"));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const [lMaj, lMin, lPat] = parse(latest);
  const [cMaj, cMin, cPat] = parse(current);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

export function runUpdateCheck(currentVersion: string): void {
  fetchLatestVersion()
    .then((latest) => {
      if (isNewer(latest, currentVersion)) {
        process.stderr.write(
          `\nNotice: A newer version of ${PACKAGE_NAME} is available (${latest}). ` +
          `Run \`npm install -g ${PACKAGE_NAME}\` to update.\n\n`
        );
      }
    })
    .catch(() => { /* silently ignore — must not block or crash */ });
}
