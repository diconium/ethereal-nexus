import React from 'react';
import {
  component,
  dialog,
  select,
  datasource,
  type Output,
} from '@ethereal-nexus/core';

const dialogSchema = dialog({
  staticdropdownsingle: select({
      label: 'Static Dropdown',
      placeholder: 'Select an option',
      tooltip: 'This is a static dropdown',
      required: true,
      values: [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
      ],
    },
  ),
  staticdropdownmultiple: select({
      label: 'Static Multiselect Dropdown',
      placeholder: 'Select at least one option',
      tooltip: 'This is a static Multiselect dropdown',
      multiple: true,
      required:true,
      values: [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
      ],
    },
  ),
  datasourcevalue: datasource({
    multiple: true,
    required: true,
    label: 'My Datasource label',
    placeholder: 'My Datasource placeholder',
    url: 'http://localhost:8080/datasource-example.json',
    body: { param1: 'Hello', param2: 'World' },
    tooltip: 'This is the datasource and the data is coming from an external source',
  }),
})
  .tabs({
    Dropdowns: {
      staticdropdownsingle: true,
      staticdropdownmultiple: true,
      datasourcevalue: true,
    },
  });

const schema = component({ version: '0.0.1' }, dialogSchema);

type Props = Output<typeof schema>

export const DropdownExample: React.FC<Props> = ({
                                                   staticdropdownsingle,
                                                   staticdropdownmultiple = [],
                                                   datasourcevalue,
                                                 }) => {

  return (
    <div>
      <p>These are the values selected on the author dialog</p>
      <ul>
        <li>staticdropdownsingle: {staticdropdownsingle}</li>
        <li>Static dropdown {staticdropdownmultiple ? (
          <ul>
            {staticdropdownmultiple.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : 'No value selected'}</li>

        datasourcevalue: {datasourcevalue.map((item) => (
          <li key={item}>{item}</li>
        ))}

      </ul>

    </div>
  );
};