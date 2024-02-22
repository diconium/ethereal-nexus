import { FC } from 'react';
import r2wc from '@r2wc/react-to-web-component';

export interface Props {
  name: string;
  image: string;
  url: string;
}

const MyComponent: FC<Props> = ({ name, image, url }) => {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <img src={image} style={{ maxWidth: '100%', height: 'auto' }}></img>
      <a href={url}>Profile</a>
    </div>
  );
};

export default MyComponent;

if (!window.customElements.get('my-component')) {
  customElements.define(
    'my-component',
    r2wc(MyComponent, {
      props: {
        name: 'string',
        image: 'string',
        url: 'string',
      },
    }),
  );
}
