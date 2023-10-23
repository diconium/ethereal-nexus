import r2wc from '@r2wc/react-to-web-component';
import './Title.css'
export interface Title {
  name: string;
  label: string;
  url: string;
  type?: 'submit' | 'button' | 'reset' | undefined;
  style?: string;
}

export default function Title() {
  return (
      <section className="bg-white py-8">
        <div className="container max-w-5xl mx-auto m-8">
          <h2 className="w-full my-2 text-5xl font-bold leading-tight text-center text-gray-800">
            Title
          </h2>
          <div className="w-full mb-4">
            <div className="h-1 mx-auto gradient w-64 opacity-25 my-0 py-0 rounded-t"></div>
          </div>
        </div>
      </section>

  );
}
if (!window.customElements.get('title-vite')) {
  customElements.define(
    'title-vite',
    r2wc<Title>(Title, {
      props: {
        name: 'string',
        label: 'string',
        url: 'string',
        type: 'string',
        style: 'string',
      },
    }),
  );
}
