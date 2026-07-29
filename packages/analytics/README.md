Internal analytics pipeline for Stellar Explain — tracks anonymous usage events and surfaces them via a dashboard API.


## Dashboard API

Refer to [DASHBOARD_API.md](./DASHBOARD_API.md) for complete documentation.

### Example: Get summary

```bash
curl "https://stellar-explain-core.onrender.com/analytics/summary"
```

### Example: Get timeseries

```bash
curl "https://stellar-explain-core.onrender.com/analytics/timeseries?bucket=hour"
```

### Example: Get top hashes

```bash
curl "https://stellar-explain-core.onrender.com/analytics/top-hashes?limit=10"
```

### Example: Get error breakdown

```bash
curl "https://stellar-explain-core.onrender.com/analytics/errors"
```

### Example: Get session count

```bash
curl "https://stellar-explain-core.onrender.com/analytics/sessions"
```
