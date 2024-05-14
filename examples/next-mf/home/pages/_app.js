import App from 'next/app';
import {init} from '@module-federation/runtime'

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

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
    </>
  );
}

MyApp.getInitialProps = async ctx => {
  const appProps = await App.getInitialProps(ctx);
  return appProps;
};
export default MyApp;
