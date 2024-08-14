import React from 'react';
import {
  component,
  hidden,
  multifield,
  object,
  optional,
  pathbrowser,
  text,
  dialog,
  rte,
  dynamic,
  image,
  type Output,
  type GetServerSideProps,
} from '@ethereal-nexus/core';

import { Item } from '../../patterns';
import styles from './ReactHelloWorld.module.css';
import { Parsys } from '@ethereal-nexus/conector-aem-react';


const dialogSchema = dialog({
  title: text({
    label: 'Title',
    placeholder: 'Title',
    required: true,
  }),
  subtitle: text({
    label: 'Sub-Title',
    placeholder: 'Sub-Title',
  }),
  image: image({
    required: true,
    label: 'Image',
    placeholder: 'Some Image',
  }),
  imagetwo: image({
    label: 'Image 2',
    placeholder: 'Some 2nd Image',
    tooltip: 'This is the second image',
  }),
  datetime: optional(
    hidden({
      type: 'string',
    }),
  ),
  rich: rte({
    label: 'This is a RTE',
    placeholder: 'Place any text here',
    required: true
  }),
  banners: multifield({
    required: true,
    label: 'Banners',
    children: object({
      title: text({
        label: 'Title',
        placeholder: 'Title',
        required: true,
      }),
      link: pathbrowser({
        label: 'Link',
        placeholder: 'Link',
        required: true,
      }),
    }),
  }),
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
  });

const dynamicSlots = {
  dynamiczoneone: dynamic({}),
  dynamiczonetwo: dynamic({}),
};

const schema = component({ name: 'TestReactHelloWorld', version: '0.0.87' }, dialogSchema, dynamicSlots);

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
