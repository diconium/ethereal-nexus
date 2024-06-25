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
  type Output,
  type GetServerSideProps
} from '@ethereal-nexus/core';
import { Item } from '../../patterns';
import styles from './ReactHelloWorld.module.css'; // Import css modules stylesheet as styles

const dialogSchema = dialog({
  title: text({
    label: 'Title',
    placeholder: 'Title'
  }),
  subtitle: text({
    label: 'Sub-Title',
    placeholder: 'Sub-Title'
  }),
  datetime: optional(
    hidden({
      type: 'string'
    })
  ),
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
      banners: true
    },
    tab3: {
      title: true
    }
  })

const schema = component({ name: 'TestReactHelloWorld'}, dialogSchema);

type Props = Output<typeof schema>

export const ReactHelloWorld: React.FC<Props> = ({ title, subtitle, datetime }) => {
  return (
    <div className={styles.error}>
      My new text Hello World from react! v.1.0.9
      <div>Props:
        <ul>
          <Item text={title} />
          <Item text={subtitle} />
          {datetime ? <Item text={datetime} /> : null}
        </ul>
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
