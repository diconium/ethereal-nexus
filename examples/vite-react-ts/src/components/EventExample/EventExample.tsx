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
  rte,
  datamodel,
  type Output,
} from '@ethereal-nexus/core';

const dialogSchema = dialog({

  image: image({
    label: 'Image',
  }),
  person: datamodel({
    placeholder: 'Select a person',
    label: 'Person',
    required: true,
    tooltip: 'This is a person',
  }),
  anothermultifield: multifield({
    label: 'Nested',
    children: object({
      isadvanced: checkbox({
        label: 'Advanced',
        tooltip: 'Check this box to show advanced options',
      }),
    }),
  }),
  contributors: multifield({
    label: 'Contributors',
    tooltip: 'This is a list of contributors',
    children: object({
      person: datamodel({
        placeholder: 'Selet a person',
        label: 'Person',
        required: true,
        tooltip: 'This is a person',

      }),
    }),
  }),
  group: group({
    label: 'Group Label',
    toggle: false,
    tooltip: 'This is a tooltip for the whole group',
    children: object({
      rte: rte({
        label: 'This is a RTE',
        placeholder: 'Place any text here',
      }),
      image: image({
        label: 'Image',
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
    person: true,
    anotherevent: true,
    anothermultifield: true,
    contributors: true,
    image: true,
  },
}).conditions({
    anotherevent: ({exists})  => exists('person'),
    anothermultifield: ({exists})  => exists('anotherevent'),
    contributors: ({exists})  => exists('anothermultifield'),
    image: ({exists})  => exists('anotherevent'),
    group: {
      image: ({exists})  => exists('group.rte'),
      grouptitle: ({exists})  => exists('group.image'),
      isadvanced: ({exists})  => exists('group.grouptitle'),
      event: ({exists})  => exists('group.isadvanced'),
      staticdropdownsingle: ({exists})  => exists('group.event'),
      staticdropdownmultiple: ({exists})  => exists('group.staticdropdownsingle'),
      datasourcevalue: ({exists})  => exists('group.staticdropdownmultiple'),
      link: ({eq})  => eq('group.staticdropdownmultiple','one'),
      banners: ({exists})  => exists('group.link'),


    }
  }

)

const schema = component({ version: '0.0.34' }, dialogSchema, {  });

type Props = Output<typeof schema>

export const EventExample: React.FC<Props> = ({
                                                group,
                                                person,
                                                anotherevent,
                                                anothermultifield,
                                                contributors,
                                                image
                                              }) => {
  return (
    <div>
      {person && (
        <p>person: {person.firstName} {person.lastName}</p>
      )}
      <p>group.active: {group.active ? 'true' : 'false'}</p>
      <h3>image from the tab</h3>
      <p>{image}</p>
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

      <h2>Another Multifield with a datamodel </h2>
      <ul>
        {contributors && contributors.map(({ person }) => {
          return (
            <li>person: {person.firstName} {person.lastName}</li>
          );
        })}
      </ul>
    </div>
  );
};
