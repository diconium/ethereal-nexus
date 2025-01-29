import React from 'react';
import {
  checkbox,
  component,
  dialog,
  dynamic,
  type GetServerSideProps, hidden,
  image, multifield, object,
  optional,
  type Output, pathbrowser, rte, select,
  text
} from '@ethereal-nexus/core';
import { Slot } from '@ethereal-nexus/react'

import { Item } from '@/patterns';
import { titles } from '@/dialogs/titles.ts';

import './ReactHelloWorld.css';

const images = {
  image: image({
    label: 'Image',
  }),
  imagetwo: image({
    label: 'Image 2',
    tooltip: 'This is the second image'
  }),
}

const rteComponent = rte({
  label: 'This is a RTE',
  placeholder: 'Place any text here',
  defaultValue: "this is the rte default value"
})

const dialogSchema = dialog({
  ...titles,
  ...images,
  datetime: optional(
    hidden({
      type: 'string'
    })
  ),
  checkbox: checkbox({
    label: 'Show Links',
    defaultValue: false
  }),
  rich: rteComponent,
  select: select({
    label: 'Select',
    multiple: true,
    defaultValue: ['foo'],
    values: [
      {
        value: 'foo',
        label: 'Foo'
      },
      {
        value: 'bar',
        label: 'Bar'
      }
    ]
  }),
  banners: multifield({
    label: 'Banners',
    children: object({
      title: text({
        label: 'Title',
        placeholder: 'Title'
      }),
      link: pathbrowser({
        label: 'Link',
        placeholder: 'Link',
        defaultValue: "/content/default-value"
      })
    })
  }),
  dynamiczoneone: dynamic({}),
  dynamiczonetwo: dynamic({}),
})
  .tabs({
    tab1: {
      checkbox: true,
      select: true,
      subtitle: true,
      banners: true,
      dynamiczoneone: true,
      dynamiczonetwo: true
    },
    tab2: {
      rich: true,
    },
    tab3: {
      title: true,
      image: true,
      imagetwo: true,
    },
  })
  .conditions({
    subtitle: ({ eq, or }) => or(
      eq('title', 'foo'),
      eq('title', 'bar'),
    ),
    banners: {
      $this: ({ eq }) => eq('checkbox', true),
      link: ({ eq, and, exists }) => and(
        eq('checkbox', true),
        exists('banners'),
      )
    }
  });

const schema = component({ name: 'TestReactHelloWorld', version: '4.0.6' }, dialogSchema);

type Props = Output<typeof schema>

export const ReactHelloWorld: React.FC<Props> = ({
                                                   title,
                                                   subtitle,
                                                   datetime,
                                                   rich,
                                                   image,
                                                   dynamiczoneone,
                                                   dynamiczonetwo,
                                                 }) => {

  return (
    <div className={'error'}>
      My new text Hello World from react! v.1.0.9
      <div dangerouslySetInnerHTML={{ __html: rich }} />
      <div>Props:
        <ul>
          <Item text={title} />
          <Item text={subtitle} />
          {datetime ? <Item text={datetime} /> : null}
        </ul>
      </div>

      <div className={'columnsContainer'}>
        <div className={'column'}>
          <img src={image.url} alt={image.alt} />
        </div>
        <div className={'column'}>
          <img src={image.url} alt={image.alt} />
        </div>
      </div>

      <div className={'columnsContainer'}>
        <div className={'column'}>
          {/*Slot component now accepts props that will be passed to the slotted component, it should be able to accept strings, objects, numbers and booleans*/}
          <Slot name={dynamiczoneone} title="Hello from the Slot" image={{ src: 'google.com', alt: 'Alt Image' }} days={42} true={true} />
        </div>
        <div className={'column'}>
          <Slot name={dynamiczonetwo} />
        </div>
      </div>

    </div>
  );
};

export const getServerSideProps = (async () => {
  // Fetch data from external API
  const res = await fetch('https://worldtimeapi.org/api/timezone/Europe/Berlin');
  const time = await res.json();
  // Pass data to the page via props
  return { props: { datetime: time.datetime } };
}) satisfies GetServerSideProps<Output<typeof schema>>;
