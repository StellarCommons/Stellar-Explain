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

We respect the `DNT` (Do Not Track) header. If your browser sends a DNT
signal, analytics tracking is disabled entirely.

## Data Retention

Events are stored temporarily in memory and are not persisted to disk or
distributed. Session IDs are regenerated on each page load.

## Data Sharing

We do not sell, share, or transfer analytics data to third parties.
Aggregated, anonymized metrics may be shared publicly (e.g. open dashboard).

## Opt-Out

To disable analytics tracking:

- Set `DNT: 1` in your browser headers, or
- Use the `--no-analytics` flag if using the CLI.

## Contact

For privacy-related questions, open an issue on GitHub.
