import React, {Fragment, Suspense,lazy} from 'react';
import Head from 'next/head';
import {init, loadRemote} from '@module-federation/runtime'

const Home = ({loaded}) => {
  const remotes = isServer => {
    const location = isServer ? 'ssr' : 'chunks';
    return [
      {
        name: 'remote',
        entry:`http://localhost:3002/_next/static/${location}/remoteEntry.js`
      },
    ];
  };

  init({
    name: 'home',
    remotes: remotes(typeof window === 'undefined'),
    force: true
  })

  const RemoteButton = lazy(() => loadRemote('remote/Button'));

  return (
    <div>
      <Head>
        <title>Home</title>
        <link rel="icon" href="/nextjs-dynamic-ssr/home/public/favicon.ico"/>
      </Head>

      <div className="hero">
        Remote button:
        <Suspense fallback={"loading remote title"}>
          <RemoteButton/>
        </Suspense>
      </div>
    </div>
  );
};
//
Home.getInitialProps = async ctx => {
  return {};
};

export default Home;
