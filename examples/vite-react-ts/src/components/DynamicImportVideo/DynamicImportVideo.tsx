import React from 'react';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import {
  text,
  dialog,
  component,
  type Output,
} from '@ethereal-nexus/core';

const dialogSchema = dialog({
  url: text({
    label: 'Source',
    placeholder: 'http://yourvideo.com/video/1',
    tooltip: 'The source for your video',
  }),
});
const schema = component({ name: 'DynamicImportVideo', version: '0.0.1' }, dialogSchema);
type Props = Output<typeof schema>

export const DynamicImportVideo: React.FC<Props> = ({ url }) => {
  return (
    <div>
      My new text Hello World from react!
      <MediaPlayer title="Sprite Fight" src={url}>
        <MediaProvider />
      </MediaPlayer>
    </div>
  );
};