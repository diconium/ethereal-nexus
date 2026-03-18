// Minimal ambient declaration for Storybook test helpers used in Storybook 10+
// This avoids TypeScript errors when the package provides runtime exports but no types
declare module '@storybook/test' {
  // Testing-library helpers
  export const within: any;
  export const userEvent: any;

  // Jest-style expect adapted for Storybook test runner
  export const expect: any;

  export default {
    within,
    userEvent,
    expect,
  };
}
