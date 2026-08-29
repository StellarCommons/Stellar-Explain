import { describe, it, expect } from "vitest";
import { EventName } from "../src/types/events";
import { buildAddressBookSaveEvent } from "../src/events/address-book";
import { AnalyticsClient } from "../src/client";

describe("buildAddressBookSaveEvent", () => {
  it("builds an address_book_save event without PII", () => {
    const event = buildAddressBookSaveEvent();

    expect(event.name).toBe("address_book_save");
    expect(event.properties).toEqual({});
    expect(event.timestamp).toBeInstanceOf(Date);
  });
});

describe("AnalyticsClient.trackAddressBookSave", () => {
  it("queues an address_book_save event for delivery", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackAddressBookSave();

    await client.flush();
    expect((flushed[0] as { name?: string }).name).toBe("address_book_save");
    client.destroy();
  });
});

describe("EventName registry", () => {
  it("registers the address_book_save event name", () => {
    expect(EventName).toContain("address_book_save");
  });
});