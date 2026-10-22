---
"@ethereal-nexus/dialog-ui-spectrum": patch
---

Preserve RTE link attributes and improve pathbrowser fallback

- Allow anchor attributes (`href`, `target`, `rel`, `title`, `aria-label`, `download`) through the rich text sanitizer so links are no longer stripped.
- Enable RTE source-edit mode by default when `features` is `null`/`undefined`.
- Add a `TextField` fallback in `SpectrumPathbrowserField` when the AEM Coral `foundation-autocomplete` web component is not available (e.g. in Storybook or standalone usage).
- Add `data-testid` / accessibility hooks to the rich text editor for Playwright and Storybook interaction tests.
