import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';

let server: Server;
let url: string;
const originalArgv = process.argv;

async function runCli(args: string[]): Promise<{ out: string; err: string }> {
  vi.resetModules();
  // update check is unrelated to this fix (and its exports are missing on main)
  vi.doMock('../src/utils/update-check.js', () => ({
    checkForUpdate: async () => {},
    getUpdateNotice: () => null,
  }));
  process.argv = ['node', 'stellar-explain', '--no-update-check', ...args];
  const out: string[] = [];
  const err: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...a) => void out.push(a.join(' ')));
  vi.spyOn(console, 'error').mockImplementation((...a) => void err.push(a.join(' ')));
  await import('../src/index.js');
  // commands are async actions; wait for the mock server round-trip
  await new Promise((r) => setTimeout(r, 300));
  return { out: out.join('\n'), err: err.join('\n') };
}

beforeAll(async () => {
  server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ success: true, data: { ok: true, path: req.url } }));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  process.argv = originalArgv;
  vi.restoreAllMocks();
});

describe('commands read --url from the parent program (#1496)', () => {
  it('health', async () => {
    const { out, err } = await runCli(['--url', url, 'health']);
    expect(err).not.toContain("reading 'opts'");
    expect(out).toContain('"ok": true');
  });

  it('tx', async () => {
    const { out, err } = await runCli(['--url', url, 'tx', `hash-${Date.now()}`]);
    expect(err).not.toContain("reading 'opts'");
    expect(out).toContain('"ok": true');
  });

  it('account', async () => {
    const { out, err } = await runCli(['--url', url, 'account', `G${Date.now()}`]);
    expect(err).not.toContain("reading 'opts'");
    expect(out).toContain('"ok": true');
  });

  it('batch', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'se-cli-')), 'batch.json');
    writeFileSync(file, JSON.stringify([{ type: 'tx', identifier: 'abc' }]));
    const { out, err } = await runCli(['--url', url, 'batch', file]);
    expect(err).not.toContain('TypeError');
    expect(out).toContain('"ok": true');
  });
});
