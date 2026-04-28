import * as fs from 'fs';
import * as path from 'path';

export type BumpType = 'major' | 'minor' | 'patch';

export interface ChangesetEntry {
  packages: string[];
  bump: BumpType;
  summary: string;
}

export function parseChangelog(changelogPath: string): string[] {
  if (!fs.existsSync(changelogPath)) return [];
  const content = fs.readFileSync(changelogPath, 'utf-8');
  return content
    .split('\n')
    .filter((l) => l.startsWith('## '))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

export function latestVersion(changelogPath: string): string | null {
  const versions = parseChangelog(changelogPath).filter((v) => v !== 'Unreleased');
  return versions[0] ?? null;
}

export function formatChangesetFile(entry: ChangesetEntry): string {
  const pkgLines = entry.packages.map((p) => `"${p}": ${entry.bump}`).join('\n');
  return `---\n${pkgLines}\n---\n\n${entry.summary}\n`;
}

export function writeChangeset(changesetDir: string, entry: ChangesetEntry): string {
  const slug = entry.summary
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);
  const filename = `${slug}.md`;
  const fullPath = path.join(changesetDir, filename);
  fs.mkdirSync(changesetDir, { recursive: true });
  fs.writeFileSync(fullPath, formatChangesetFile(entry), 'utf-8');
  return fullPath;
}

export function listPendingChangesets(changesetDir: string): string[] {
  if (!fs.existsSync(changesetDir)) return [];
  return fs
    .readdirSync(changesetDir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md');
}
