import React from 'react';
import {
  component,
  calendar,
  dialog,
  checkbox,
  type Output,
} from '@ethereal-nexus/core';

const dialogSchema = dialog({

  isadvanced: checkbox({
    label: 'Advanced',
    tooltip: 'Check this box to show advanced options',
  }),
  event: calendar({
      label: 'Event Date',
      valueformat: 'YYYY-MM-DD[T]HH:mmZ',
      displayformat: 'D MMMM YYYY hh:mm a',
      headerformat: 'MMMM YYYY',
      tooltip: 'This is the Event date picker',
      placeholder: 'Choose a date',
      startday: '1',
      max: '2024-02-09',
      min: '2024-02-01',
    },
  ),
});

const schema = component({ version: '0.0.1' }, dialogSchema);

type Props = Output<typeof schema>

export const EventExample: React.FC<Props> = ({
                                                event,
                                                isadvanced,
                                              }) => {

  return (
    <div>
      <p>The selected date is:</p>
      <p>{event}</p>
      <p>Checkbox is : {isadvanced === true ? 'checked' : 'not checked'} </p>
    </div>
  );
};
