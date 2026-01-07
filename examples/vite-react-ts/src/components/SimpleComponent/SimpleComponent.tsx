import React from 'react';
import {
  component,
  text,
  dialog,
  type Output,
} from '@ethereal-nexus/core';

const dialogSchema = dialog({
  title: text({
    label: 'Title',
    placeholder: 'Any title',
  }),
});
const version = '0.0.5';
const schema = component({ version: version }, dialogSchema);

type Props = Output<typeof schema>

export const SimpleComponent: React.FC<Props> = ({ title }) => {

  return (
    <div>
      My new text Hello World from react!
      <blockquote>{title}</blockquote>
      <div>
        Component version ${version}
      </div>
    </div>
  );
};
