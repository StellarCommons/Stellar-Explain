import assert from "node:assert/strict";
import test from "node:test";

import { StellarExplainClient, UpstreamError } from "../src/index.ts";

test("throws UpstreamError for non-json upstream responses", async () => {
  const client = new StellarExplainClient({
    baseUrl: "https://api.example.com",
    fetchImpl: async () =>
      new Response("<html><body>Bad Gateway</body></html>", {
        status: 502,
        headers: {
          "Content-Type": "text/html",
        },
      }),
  });

  await assert.rejects(
    client.explainTransaction("abc123"),
    (error: unknown) => {
      assert.ok(error instanceof UpstreamError);
      assert.equal(error.statusCode, 502);
      assert.match(
        error.message,
        /Received non-JSON response from server/
      );
      assert.match(error.message, /status 502/);
      assert.match(error.message, /Bad Gateway/);
      return true;
    }
  );
});
