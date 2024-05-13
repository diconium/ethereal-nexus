import { webcomponent, dialog, text, type Output, type GetServerSideProps } from '@ethereal-nexus/core';
import React from 'react';

const schema = dialog({
  title: text({
    label: "Title",
    placeholder: "Title",
  }),
  subtitle: text({
    label: "Title",
    placeholder: "Title",
  })
});

type ReactHelloWorldProps = Output<typeof schema> & {
  datetime?: string;
}

//version: 1.0.2
export const ReactHelloWorld: React.FC<ReactHelloWorldProps> = ({title, subtitle, datetime}) => {
  return (
    <div>
      My new text Hello World from react! v.1.0.9
      <div>Props:
        <ul>
          <li>{title}</li>
          <li>{subtitle}</li>
          {datetime ? <li>{datetime}</li> : null }
        </ul>
      </div>
    </div>
  );
};
ReactHelloWorld.displayName = 'ReactHelloWorld';

export const getServerSideProps = (async () => {
  // Fetch data from external API
  const res = await fetch('https://worldtimeapi.org/api/timezone/Europe/Berlin')
  const time = await res.json()
  // Pass data to the page via props
  return { props: { datetime: time.datetime } }
}) satisfies GetServerSideProps<ReactHelloWorldProps>

webcomponent(schema, ReactHelloWorld)
