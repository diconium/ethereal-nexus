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
  dynamiczones,
  image,
  type Output,
  type GetServerSideProps,
} from '@ethereal-nexus/core';
import { Item } from '../../patterns';
import styles from './ReactHelloWorld.module.css';

const dialogSchema = dialog({
  title: text({
    label: 'Title',
    placeholder: 'Title',
  }),
  subtitle: text({
    label: 'Sub-Title',
    placeholder: 'Sub-Title',
  }),
  image: image({
    label: 'Image',
    placeholder: 'Some Image'
  }),
  imagetwo: image({
    label: 'Image 2',
    placeholder: 'Some 2nd Image'
  }),
  datetime: optional(
    hidden({
      type: 'string',
    }),
  ),
  rich: rte({
    label: 'This is a RTE',
    placeholder: 'Place any text here',
  }),
  banners: multifield({
    label: 'Banners',
    children: object({
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
})
  .tabs({
    'a minha tab': {
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

const dynamicZonesSchema = dynamiczones({
  dynamiczoneone: dynamic({}),
  dynamiczonetwo: dynamic({}),
});

const schema = component({ name: 'TestReactHelloWorld', version: '0.0.31' }, dialogSchema, dynamicZonesSchema);

type Props = Output<typeof schema>

export const ReactHelloWorld: React.FC<Props> = ({ title, subtitle, datetime, rich, dynamiczoneone, dynamiczonetwo , image, imagetwo}) => {

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
          {dynamiczoneone && dynamiczoneone.childrenHtml && (
            <div className={'new'}>
              <div dangerouslySetInnerHTML={{ __html: atob(dynamiczoneone?.childrenHtml) }} />
            </div>
          )}
          {dynamiczoneone && dynamiczoneone.dataPath && dynamiczoneone.dataConfig && (

            <div className={'new'}>
              {/*// @ts-ignore*/}
              <cq data-path={dynamiczoneone.dataPath} data-config={JSON.stringify(dynamiczoneone.dataConfig)}></cq>
            </div>
          )}
        </div>
        <div className={styles.column}>
          {dynamiczonetwo && dynamiczonetwo.childrenHtml && (
            <div className={'new'}>
              <div dangerouslySetInnerHTML={{ __html: atob(dynamiczonetwo?.childrenHtml) }} />
            </div>
          )}
          {dynamiczonetwo && dynamiczonetwo.dataPath && dynamiczonetwo.dataConfig && (

            <div className={'new'}>
              {/*// @ts-ignore*/}
              <cq data-path={dynamiczonetwo.dataPath} data-config={JSON.stringify(dynamiczonetwo.dataConfig)}></cq>
            </div>
          )}
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
