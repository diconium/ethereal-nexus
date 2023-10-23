import r2wc from '@r2wc/react-to-web-component';
import './ContentTeaser.css'
export interface ContentTeaser {
  name: string;
  label: string;
  url: string;
  type?: 'submit' | 'button' | 'reset' | undefined;
  style?: string;
}

export default function ContentTeaser() {
  return (
      <div className="w-full md:w-1/3 p-6 flex flex-col flex-grow flex-shrink">
        <div className="flex-1 bg-white rounded-t rounded-b-none overflow-hidden shadow">
          <a href="#" className="flex flex-wrap no-underline hover:no-underline">
            <p className="w-full text-gray-600 text-xs md:text-sm px-6">
              xGETTING STARTED
            </p>
            <div className="w-full font-bold text-xl text-gray-800 px-6">
              Lorem ipsum dolor sit amet.
            </div>
            <p className="text-gray-800 text-base px-6 mb-5">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam at ipsum eu nunc commodo posuere et sit amet ligula.
            </p>
          </a>
        </div>
        <div className="flex-none mt-auto bg-white rounded-b rounded-t-none overflow-hidden shadow p-6">
          <div className="flex items-center justify-start">
            <button className="mx-auto lg:mx-0 hover:underline gradient text-white font-bold rounded-full my-6 py-4 px-8 shadow-lg focus:outline-none focus:shadow-outline transform transition hover:scale-105 duration-300 ease-in-out">
              Action
            </button>
          </div>
        </div>
      </div>


  );
}
if (!window.customElements.get('content-teaser')) {
  customElements.define(
    'content-teaser',
    r2wc<ContentTeaser>(ContentTeaser, {
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
