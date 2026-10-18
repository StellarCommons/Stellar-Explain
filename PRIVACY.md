# Privacy Policy for Stellar Explain Analytics

## Data Collected

The analytics system tracks anonymous usage events to help improve Stellar
Explain. The following event names may be recorded:

- `page_view`
- `button_click`
- `form_submit`
- `api_call`
- `error_occurred`
- `login`
- `logout`
- `search`
- `purchase`
- `refund`

Each event includes:
- A randomly generated event ID (ephemeral, not linked to identity)
- The event name
- A timestamp
- A session ID (generated client-side, ephemeral)
- Optional properties (e.g. page path, button ID)

## What is NOT collected

- **No PII (Personally Identifiable Information):** We do not collect names,
  email addresses, IP addresses, or any other personal data.
- **No cookies:** We do not use cookies for analytics.
- **No cross-site tracking:** Analytics are scoped to Stellar Explain domains.

## Do Not Track (DNT)

The `DNT` (Do Not Track) header is not currently honored; this is planned
but not implemented.

## Data Retention

Events are buffered in memory and flushed by the backend to an NDJSON file on
disk (`ANALYTICS_LOG_PATH`, default `./analytics.ndjson`). Only the event
name and timestamp are stored. There is no automatic retention period; the
operator is responsible for rotating or deleting the file. Events are not
distributed. Session IDs are regenerated on each page load.

## Data Sharing

We do not sell, share, or transfer analytics data to third parties.
Aggregated, anonymized metrics may be shared publicly (e.g. open dashboard).

## Opt-Out

To disable analytics tracking:

Opt-out via the `DNT` header or a CLI `--no-analytics` flag is not yet
implemented.

## Contact

For privacy-related questions, open an issue on GitHub.
