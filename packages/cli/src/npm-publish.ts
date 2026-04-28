import * as fs from 'fs';
import * as path from 'path';

export interface PackageEntry {
  relativePath: string;
  sizeBytes: number;
}

export function readNpmIgnorePatterns(packageDir: string): string[] {
  const ignoreFile = path.join(packageDir, '.npmignore');
  if (!fs.existsSync(ignoreFile)) return [];
  return fs
    .readFileSync(ignoreFile, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

export function listPublishedFiles(distDir: string): PackageEntry[] {
  if (!fs.existsSync(distDir)) return [];
  return fs
    .readdirSync(distDir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const full = path.join(distDir, e.name);
      const { size } = fs.statSync(full);
      return { relativePath: path.join('dist', e.name), sizeBytes: size };
    });
}

export function totalPublishedSize(entries: PackageEntry[]): number {
  return entries.reduce((sum, e) => sum + e.sizeBytes, 0);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function summarisePublish(packageDir: string): string {
  const entries = listPublishedFiles(path.join(packageDir, 'dist'));
  const total = totalPublishedSize(entries);
  const patterns = readNpmIgnorePatterns(packageDir);
  return [
    `Files: ${entries.length}`,
    `Total size: ${formatBytes(total)}`,
    `Ignored patterns: ${patterns.length}`,
  ].join(' | ');
}
