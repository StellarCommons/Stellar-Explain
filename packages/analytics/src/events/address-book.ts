import { AnalyticsEvent } from '../types';

export type AddressBookAction = 'add' | 'remove' | 'load';

/**
 * Builds an address-book analytics event.
 *
 * Deliberately never accepts or records the address itself — only the
 * action taken and how many entries the address book holds afterward,
 * so no user-identifying wallet/contact data is captured.
 */
export function createAddressBookEvent(
  action: AddressBookAction,
  entryCount: number
): AnalyticsEvent {
  return {
    name: 'address_book',
    timestamp: Date.now(),
    properties: {
      action,
      entryCount,
    },
  };
}
