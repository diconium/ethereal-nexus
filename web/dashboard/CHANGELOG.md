# @ethereal-nexus/dashboard

## 3.2.2

### Patch Changes

- d8b9d65: update react and react-dom versions in package.json [CVE-2025-66478]

## 3.2.1

### Patch Changes

- 1aa516c: fix: downgrade cmdk version to 0.2.1 and fix ProjectMemberList rendering

## 3.2.0

### Minor Changes

- 85a894c: feat: add Redis cache configuration and enhance caching logic
- 90cf802: Update dependencies

## 3.1.0

### Minor Changes

- 17350e7: implemented optional in-memory cache to improve SSR call
- c260624: feat: implement Redis cache for improved data handling and performance

### Patch Changes

- 639f570: optimize database queries for component version retrieval and update schema

## 3.0.2

### Patch Changes

- c4b6624: chore: enhance dynamic import performance with timing logs

## 3.0.1

### Patch Changes

- d7ceedf: fix: implement LRU caching for dynamic imports and improve error handling

## 3.0.0

### Major Changes

- 3923391: feat: implement feature flag management with CRUD operations and UI components.

  This allows projects to have feature flag configurations.
  Because of this there were breaking changes since the dashboard now displays feature flags and their states.

## 2.4.0

### Minor Changes

- 9894831: removes dialog information from all components endpoint

## 2.3.0

### Minor Changes

- 61a6731: enhance cookie handling for secure API key retrieval based on protocol

## 2.2.0

### Minor Changes

- 41160bc: Adds more logs on cli auth
- 9da1478: update redirect logic to use base URL from environment variables

## 2.1.0

### Minor Changes

- 372fe63: Keycloak integration with CLI

## 2.0.0

### Major Changes

- 9f1d2bf: Removed the information about component and version from the asset url that is deployed to the bucket.

## 1.8.2

### Patch Changes

- 73ed202: fix: updated dependencies for security reasons]

## 1.8.1

### Patch Changes

- 6ba2a73: fix: use latest query only when coming from a latest component

## 1.8.0

### Minor Changes

- e752096: feat: update launch to lock versions when launching into secure environments

### Patch Changes

- 14f27e2: fix: remove access control on project forms if it's new form

## 1.7.0

### Minor Changes

- 3df4ac2: feat: added service users auth for API calls

## 1.6.0

### Minor Changes

- 293f23f: feat: update layout for new design system
- 293f23f: feat: added new home page and sidebar redesign

### Patch Changes

- 293f23f: fix: remove setTimeout blocking page loading

## 1.5.0

### Minor Changes

- f04e803: feat: it is now possible to remove members from projects if you have the appropriate permissions
- f04e803: feat: add delete user action to user table
- f04e803: feat: add new AUTH_CREDENTIALS_LOGIN to allow or disallow credentials authentication
- f04e803: feat: admin users are now able to manage projects even if not a member
- bbdbfb2: feat: Adds component generation, and publishing, via ai
- f04e803: feat: add magic link via azure communication service as a login option

### Patch Changes

- f04e803: chore: update azure sso adapter to microsoft-entra-id
- f04e803: fix: several permission errors for view only users were fixed
- 0cdcf05: fix: Add validations by component name and version when publishing ai generated component

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
