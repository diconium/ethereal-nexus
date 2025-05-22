import React from 'react';
import {
  component,
  text,
  dialog,
  type Output,
  pathbrowser,
  calendar,
} from '@ethereal-nexus/core';
const dialogSchema = dialog({
  title: text({
    label: 'Title',
    placeholder: 'Any title',
    tooltip: 'The title of the component',
    defaultValue: 'Hello World',
    validationRegex: '^Hello World$',
    validationErrorMessage: 'The text must be "Hello World"',
  }),
  asset_folder: pathbrowser({
    label: 'Test',
    tooltip: 'This is a test',
    placeholder: 'Select a path',
    folder: true,
    path: "/content/dam/",
  }),
  other_folder: pathbrowser({
    label: 'Test',
    tooltip: 'This is a test',
    placeholder: 'Select a path',
    folder: false,
    path: "/content",
  }),
  default_pathbrowser: pathbrowser({
    label: 'Test',
    tooltip: 'This is a test',
    placeholder: 'Select a path'
  }),
  calendar: calendar({
    label: 'Calendar',
    valueformat: "YYYY-MM-DD_HH:mmZ",
    displayformat: "YYYY-MM-DD",
    headerformat: "MMMM YYYY",
  })
});

const schema = component({ version: '0.0.6' }, dialogSchema);

type Props = Output<typeof schema>

export const SimpleReactHelloWorld: React.FC<Props> = ({ title, asset_folder, default_pathbrowser, other_folder }) => {

  return (
    <div>
      My new text Hello World from react!
      <blockquote>{title}</blockquote>
      <div>
        <p>Asset Folder: {asset_folder}</p>
        <p>Default Pathbrowser: {default_pathbrowser}</p>
        <p>Other Folder: {other_folder}</p>
      </div>
    </div>
  );
};
