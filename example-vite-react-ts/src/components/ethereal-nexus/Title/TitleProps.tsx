import r2wc from '@r2wc/react-to-web-component';
import './Title.css'
export interface TitleProps {
  title: string;
}

export default function Title({title}: TitleProps) {
  return (
      <section className="bg-white py-8">
        <div className="container max-w-5xl mx-auto m-8">
          <h2 className="w-full my-2 text-5xl font-bold leading-tight text-center text-gray-800">
              {title}
          </h2>
          <div className="w-full mb-4">
            <div className="h-1 mx-auto gradient w-64 opacity-25 my-0 py-0 rounded-t"></div>
          </div>
        </div>
      </section>

  );
}
if (!window.customElements.get('title-component')) {
  customElements.define(
    'title-component',
    r2wc<TitleProps>(Title, {
      props: {
        title: 'string',
      },
    }),
  );
}
