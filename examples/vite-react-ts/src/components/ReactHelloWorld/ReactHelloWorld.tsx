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

import { Item } from '@/patterns';
import { Parsys } from '@ethereal-nexus/conector-aem-react';
import { titles } from '@/dialogs/titles.ts';

import styles from './ReactHelloWorld.module.css';

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
  placeholder: 'Place any text here'
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
    label: 'Show Links'
  }),
  rich: rteComponent,
  select: select({
    label: 'Select',
    multiple: true,
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
        placeholder: 'Link'
      })
    })
  })
})
  .tabs({
    tab1: {
      subtitle: true,
      banners: true,
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

const dynamicSlots = {
  dynamiczoneone: dynamic({}),
  dynamiczonetwo: dynamic({}),
};

const schema = component({ name: 'TestReactHelloWorld', version: '0.0.86' }, dialogSchema, dynamicSlots);

type Props = Output<typeof schema>

export const ReactHelloWorld: React.FC<Props> = ({
                                                   title,
                                                   subtitle,
                                                   datetime,
                                                   rich,
                                                   image,
                                                   imagetwo,
                                                   dynamiczoneone,
                                                   dynamiczonetwo,
                                                 }) => {

  return (
    <div className={styles.error}>
      My new text Hello World from react! v.1.0.9
      <div dangerouslySetInnerHTML={{ __html: rich }} />
      <div>Props:
        <ul>
          <Item text={title} />
          <Item text={subtitle} />
          {datetime ? <Item text={datetime} /> : null}
        </ul>
      </div>

      <div className={styles.columnsContainer}>
        <div className={styles.column}>
          <img src={image} alt="image" />
        </div>
        <div className={styles.column}>
          <img src={imagetwo} alt="image 2" />
        </div>
      </div>

      <div className={styles.columnsContainer}>
        <div className={styles.column}>
          <Parsys slot={dynamiczoneone} />
        </div>
        <div className={styles.column}>
          <Parsys slot={dynamiczonetwo} />
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
