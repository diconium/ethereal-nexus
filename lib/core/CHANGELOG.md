# @ethereal-nexus/core

## 1.17.0

### Minor Changes

- 29d942b: feat: adds tag support for the next gen dialogs.

## 1.16.0

### Minor Changes

- a9beea6: Enhance SpectrumMediaField component with file type handling and improved UI for asset selection

## 1.15.0

### Minor Changes

- 5274689: fix: add validation for reserved dialog entry keys in dialog schema
- 18c065c: fix: update return type in \_primitive method based on pageProperties

## 1.14.3

### Patch Changes

- ad57b45: Improve dialogs

## 1.14.2

### Patch Changes

- e49033f: Improve dialogs

## 1.14.1

### Patch Changes

- 835d73e: chore: update next, react, and react-dom versions in package.json

## 1.14.0

### Minor Changes

- f2fb267: add SpectrumNavigation component and integrate with field rendering

### Patch Changes

- d8b9d65: update react and react-dom versions in package.json [CVE-2025-66478]

## 1.13.1

### Patch Changes

- db39d55: update PathBrowserSchema to support new path structure

## 1.13.0

### Minor Changes

- 5034f35: feat: enhance pathbrowser and navigation interfaces to support new pageProperties structure, ensuring backward compatibility with the latest connector version.

## 1.12.0

### Minor Changes

- 90cf802: Update dependencies

## 1.11.0

### Minor Changes

- 06f5b7d: Introduced configurable options in the pathbrowser to enable folder-only selection.

### Patch Changes

- 06f5b7d: Resolved an issue where the calendar did not display the date in the specified format.

## 1.10.0

### Minor Changes

- 956422d: Introduced configurable options in the pathbrowser to enable folder-only selection.

### Patch Changes

- 956422d: Resolved an issue where the calendar did not display the date in the specified format.

## 1.9.0

### Minor Changes

- 3bc5e62: add support for CSV mime type in MediaInput allowedMimeTypes

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
