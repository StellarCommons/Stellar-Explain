export interface AddressBookSaveProperties {
  /** Page path where the address was saved, when known. */
  path?: string;
  [key: string]: unknown;
}

export interface AddressBookSaveEvent {
  id: string;
  name: "address_book_save";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: AddressBookSaveProperties;
}

/**
 * Builds an `address_book_save` event recorded when a user saves an address
 * to the address book. No address value is ever included (PII-free).
 */
export function buildAddressBookSaveEvent(): AddressBookSaveEvent {
  return {
    id: crypto.randomUUID(),
    name: "address_book_save",
    timestamp: new Date(),
    properties: {},
  };
}