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
    placeholder: 'Title',
  }),
});

const schema = component({ version: '0.0.1' }, dialogSchema);

type Props = Output<typeof schema>

export const SimpleReactHelloWorld: React.FC<Props> = ({ title }) => {

  return (
    <div>
      My new text Hello World from react!
      <blockquote>{title}</blockquote>
    </div>
  );
};