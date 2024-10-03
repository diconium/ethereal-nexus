# @ethereal-nexus/dashboard

## 1.0.1

### Patch Changes

- 7807ade: fix: [83] use projectInputSchema to validate project creation form
- b6b0876: fix: [80] remove version sorting and improve version picker sort order
- d3824ca: fix: remove usage of custom jsonb after the upgrage of drizzle-orm

## 1.0.0

### Major Changes

- 1bf798d: This is the first Major release of Ethereal Nexus!

  Added environments features. This allows projects to have several configurations based on the respective environemnt and to publish them from one environment to the other using launches.
  Because of this there were breaking changes to the schema of the component configs.
