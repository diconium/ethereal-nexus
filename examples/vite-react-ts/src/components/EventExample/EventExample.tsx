import React from 'react';
import {
  component,
  calendar,
  dialog,
  checkbox,
  object,
  select,
  datasource,
  multifield,
  image,
  text,
  group,
  pathbrowser,
  type Output,
} from '@ethereal-nexus/core';

const dialogSchema = dialog({
  anothermultifield: multifield({
    label: 'Nested',
    children: object({
      isadvanced: checkbox({
        label: 'Advanced',
        tooltip: 'Check this box to show advanced options',
      }),
    }),
  }),
  group: group({
    label: 'Group Label',
    toggle: false,
    tooltip: 'This is a tooltip for the whole group',
    children: object({

      image: image({
        label: 'Image',
        placeholder: 'Some Image',
      }),
      grouptitle: text({
        label: 'Group Title',
        placeholder: 'Group Title',
      }),
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
      }),
      staticdropdownsingle: select({
          label: 'Static Dropdown',
          placeholder: 'Select an option',
          tooltip: 'This is a static dropdown',
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
          values: [
            { value: 'one', label: 'One' },
            { value: 'two', label: 'Two' },
            { value: 'three', label: 'Three' },
          ],
        },
      ),
      datasourcevalue: datasource({
        multiple: true,
        label: 'My Datasource label',
        placeholder: 'My Datasource placeholder',
        url: 'http://localhost:8080/datasource-example.json',
        body: { param1: 'Hello', param2: 'World' },
        tooltip: 'This is the datasource and the data is coming from an external source',
      }),

      link: pathbrowser({
        label: 'Link',
        placeholder: 'Link',
      }),
      banners: multifield({
        label: 'Banners',
        children: object({
          nested: multifield({
            label: 'Nested',
            children: object({
              isadvanced: checkbox({
                label: 'Advanced',
                tooltip: 'Check this box to show advanced options',
              }),
            }),
          }),
          isadvanced: checkbox({
            label: 'Advanced',
            tooltip: 'Check this box to show advanced options',
          }),
          staticdropdownmultiple: select({
              label: 'Static Multiselect Dropdown',
              placeholder: 'Select at least one option',
              tooltip: 'This is a static Multiselect dropdown',
              multiple: true,
              values: [
                { value: 'one', label: 'One' },
                { value: 'two', label: 'Two' },
                { value: 'three', label: 'Three' },
              ],
            },
          ),
          datasourcevalue: datasource({
            multiple: true,
            label: 'My Datasource label',
            placeholder: 'My Datasource placeholder',
            url: 'http://localhost:8080/datasource-example.json',
            body: { param1: 'Hello', param2: 'World' },
            tooltip: 'This is the datasource and the data is coming from an external source',
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
          }),
          image: image({
            label: 'Image',
            placeholder: 'Some Image',
          }),
          title: text({
            label: 'Title',
            placeholder: 'Title',
          }),
          link: pathbrowser({
            label: 'Link',
            placeholder: 'Link',
          }),
        }),
      }),
    }),
  }),
  anotherevent: calendar({
    label: 'Another Event Date',
    valueformat: 'YYYY-MM-DD[T]HH:mmZ',
    displayformat: 'D MMMM YYYY hh:mm a',
    headerformat: 'MMMM YYYY',
    tooltip: 'This is the Event date picker',
    placeholder: 'Choose a date',
    startday: '1',
  }),

}).tabs({
  'Grouped': {
    group: true,
  },
  'Non Grouped': {
    anotherevent: true,
    anothermultifield: true,
  },
});

const schema = component({ version: '0.0.15' }, dialogSchema,{});

type Props = Output<typeof schema>

export const EventExample: React.FC<Props> = ({
                                                group,
                                                anotherevent,
                                                anothermultifield,
                                              }) => {
  return (
    <div>
      <p>group.active: {group.active ? 'true' : 'false'}</p>

      <h2>Group</h2>
      <ul>
        <li>image: {group.image}</li>
        <li>grouptitle: {group.grouptitle}</li>
        <li>isadvanced: {group.isadvanced}</li>
        <li>event: {group.event}</li>
        <li>staticdropdownsingle: {group.event}</li>
        <li>staticdropdownmultiple: {group.event}</li>
        <li>datasourcevalue: {group.event}</li>
        <li>link: {group.event}</li>
        <h3>Banners</h3>
        {group && group.banners && group.banners.map((banner) => (<ul>
            <li>isadvanced: {banner.isadvanced}</li>
            <li>staticdropdownmultiple: {banner.staticdropdownmultiple}</li>
            <li>datasourcevalue: {banner.datasourcevalue}</li>
            <li>event: {banner.event}</li>
            <li>image: {banner.image}</li>
            <li>title: {banner.title}</li>
            <li>link: {banner.link}</li>
            <li><h4>Nested</h4>
              {banner && banner.nested && banner.nested.map((item) => (<ul>
                <li>isadvanced: {item.isadvanced}</li>
              </ul>))}
            </li>
          </ul>
        ))}
      </ul>

      <h2>Another Event</h2>
      <p>anotherevent: {anotherevent}</p>
      <h2>Another Multifield</h2>
      <ul>
        {anothermultifield && anothermultifield.map((item) => (
          <li>isadvanced: {item.isadvanced}</li>
        ))}
      </ul>
    </div>
  );
};
