import React from 'react';
import {
  component,
  tags,
  dialog,
  type Output,
} from '@ethereal-nexus/core';

const dialogSchema = dialog({
  tags: tags({
    label: 'Multiple tags',
    tooltip: 'Multiple tags',
    multiple: true,
    namespaces: ['my-site-demo', 'experience-fragments'],
  }),
  tagstwo: tags({
    label: 'One Tag',
    tooltip: 'One tag to rule them all',
    multiple: false,
  }),
});

const schema = component({ version: '0.0.6' }, dialogSchema);

type Props = Output<typeof schema>

export const TagComponent: React.FC<Props> = ({ tags, tagstwo }) => {

  return (
    <div>
      My Multiple Selected Tags:
      <ul>
        {tags && tags.map((tag, index) => (
          <li key={index}>tag: {tag}</li>
        ))}
      </ul>

      My Single Tag:
      {tagstwo && (
        <div>tagstwo: {tagstwo} </div>
      )}
    </div>
  );
};
