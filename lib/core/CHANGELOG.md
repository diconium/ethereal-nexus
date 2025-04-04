# @ethereal-nexus/core

## 1.8.0

### Minor Changes

- e3161c4: Include tags on the dialog schema.

## 1.7.2

### Patch Changes

- 0ab7e9c: Extend navigation type to allow selection of page properties
- 293f23f: chore: bump react dependencies to react 19

## 1.7.1

### Patch Changes

- a367679: build: change types order in package json

## 1.7.0

### Minor Changes

- f04e803: feat: adds item label key for multifield items.

## 1.6.0

### Minor Changes

- 2906ca2: feat: Adds Media type. Media adds the possibility to select allowedMimeTypes to be passed to CMS. Deprecates Image type.

## 1.5.1

### Patch Changes

- 90a9d7a: fix: imported same TabsArgument so TS can match tabs type from interface and function

## 1.5.0

### Minor Changes

- 1bea8ca: feat: adds item label key for multifield items.

## 1.4.0

### Minor Changes

- 87f6881: feat: image now comes as an object to support url, alt and multiple renditions.

## 1.3.0

### Minor Changes

- d08e3bf: deprecates the support of dynamic zones in favour of webcomponent slots

### Patch Changes

- d08e3bf: adds support to default values on dialog items.

## 1.2.0

### Minor Changes

- 8b65bb6: adds support for slots (like in the webcomponents). removed old dynamicslots and old parsys library since it's not needed anymore.

## 1.1.0

### Minor Changes

- b923c38: feat: adds navigation and navigation example. r2wc now has shadow: 'open' (uses shadow DOM instead of light DOM)

## 1.0.1

### Patch Changes

- aa5a9c3: fix: added possibility to add conditions on groups and groups childrens at the same time

## 1.0.0

### Major Changes

- 1bf798d: This is the first Major release of Ethereal Nexus!

  Added environments features. This allows projects to have several configurations based on the respective environemnt and to publish them from one environment to the other using launches.
  Because of this there were breaking changes to the schema of the component configs.

### Minor Changes

- 9731161: Updated libraries to support the conditionals behavior for dialogs.

### Patch Changes

- 9731161: Fix type inference for select schema
