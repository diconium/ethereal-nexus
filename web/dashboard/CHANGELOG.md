# @ethereal-nexus/dashboard

## 1.4.0

### Minor Changes

- 1bea8ca: feat: it is now possible to remove members from projects if you have the appropriate permissions
- 1bea8ca: feat: add delete user action to user table
- 1bea8ca: feat: add new AUTH_CREDENTIALS_LOGIN to allow or disallow credentials authentication
- 1bea8ca: feat: admin users are now able to manage projects even if not a member
- 1bea8ca: feat: add magic link via azure communication service as a login option

### Patch Changes

- 1bea8ca: chore: update azure sso adapter to microsoft-entra-id
- 1bea8ca: fix: several permission errors for view only users were fixed

## 1.3.2

### Patch Changes

- ab6864b: fix: split assets from main query for getEnvironmentComponentConfig for performance

## 1.3.1

### Patch Changes

- 27ba2c2: fix: adds max_connections setting from env. DRIZZLE_DATABASE_MAX_CONNECTIONS

## 1.3.0

### Minor Changes

- ba25b7e: feat: enable role change for users with admin roles

## 1.2.0

### Minor Changes

- d08e3bf: deprecates the support of dynamic zones in favour of webcomponent slots

## 1.1.0

### Minor Changes

- 8b65bb6: adds support for slots (like in the webcomponents). removed old dynamicslots and old parsys library since it's not needed anymore.

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
