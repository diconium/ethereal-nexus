---
'@ethereal-nexus/dashboard': patch
---

Remove the unused Content Advisor focus instruction settings from the dashboard and database schema. This also repairs the corresponding Drizzle migration state so future dashboard migrations apply cleanly.
