const FEDERATION_PATTERN = /^[^*\s]+\*[^*\s]+\.[a-z]{2,}$/i;

export function isFederationAddress(input: string): boolean {
  return FEDERATION_PATTERN.test(input);
}

export function parseFederationAddress(input: string): { user: string; domain: string } {
  const [user, domain] = input.split("*");
  return { user, domain };
}

export async function resolveFederationAddress(address: string): Promise<string> {
  const { domain } = parseFederationAddress(address);
  const url = `https://${domain}/.well-known/stellar.toml`;
  const tomlRes = await fetch(url);
  if (!tomlRes.ok) throw new Error(`Could not fetch stellar.toml for ${domain}`);
  const toml = await tomlRes.text();
  const federationMatch = toml.match(/FEDERATION_SERVER\s*=\s*"([^"]+)"/);
  if (!federationMatch) throw new Error(`No federation server found for ${domain}`);
  const fedUrl = `${federationMatch[1]}?q=${encodeURIComponent(address)}&type=name`;
  const fedRes = await fetch(fedUrl);
  if (!fedRes.ok) throw new Error(`Federation lookup failed for ${address}`);
  const data = await fedRes.json() as { account_id?: string };
  if (!data.account_id) throw new Error(`No account found for ${address}`);
  return data.account_id;
}
