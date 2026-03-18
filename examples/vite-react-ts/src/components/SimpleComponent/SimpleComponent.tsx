import React from 'react';
import {
  component,
  text,
  dialog,
  type Output, media,
} from '@ethereal-nexus/core';

const dialogSchema = dialog({
  text: text({
    label: 'Title',
    placeholder: 'Any title',
  }),e: text({
    label: 'Title',
    placeholder: 'Any title',
  }),
  picture: media({
    label: "Choose an image",
    enableFocusPoint: true,
  })
});
const version = '0.0.9';
const schema = component({ version: version }, dialogSchema);

type Props = Output<typeof schema>

export const SimpleComponent: React.FC<Props> = ({ text, picture }) => {


  const focusPointStyle: React.CSSProperties | undefined = picture?.focusPoint ? { objectPosition: `${picture.focusPoint.x}% ${picture.focusPoint.y}%` } : undefined;

  return (
    <div>
      My new text Hello World from react!
      <blockquote>{text}</blockquote>
      <div>
        Component version ${version}
      </div>
      <div style={{width: "400px", height: "250px", overflow: "hidden"}}>
        <img
          src={picture?.url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            ...focusPointStyle,
          }}
        />
      </div>
    </div>
  );
};
