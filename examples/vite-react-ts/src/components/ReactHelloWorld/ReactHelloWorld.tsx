import React from 'react';
import {
  dialog,
  hidden,
  multifield,
  object,
  optional,
  pathbrowser,
  text,
  type Output,
  type GetServerSideProps
} from '@ethereal-nexus/core';

const schema = dialog({
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
});

type Props = Output<typeof schema>

export const ReactHelloWorld: React.FC<Props> = ({ title, subtitle, datetime }) => {
  return (
    <div>
      My new text Hello World from react! v.1.0.9
      <div>Props:
        <ul>
          <li>{title}</li>
          <li>{subtitle}</li>
          {datetime ? <li>{datetime}</li> : null}
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
