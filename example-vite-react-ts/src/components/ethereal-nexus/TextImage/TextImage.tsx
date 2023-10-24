import r2wc from '@r2wc/react-to-web-component';
import './TextImage.css'
export interface TextImage {
  title: string;
  subtitle: string;
  image: string;
  isimageright: boolean,
}

export default function TextImage({title, subtitle, image, isimageright}: TextImage) {
  return (
      <div className={`flex ${isimageright ? 'flex-row' : 'flex-row-reverse'} flex-wrap`}>
        <div className="w-5/6 sm:w-1/2 p-6">
          <h3 className="text-3xl text-gray-800 font-bold leading-none mb-3">
              {title}
          </h3>
          <p className="text-gray-600 mb-8">
              {subtitle}
          </p>
        </div>
        <div className="w-full sm:w-1/2 p-6">
          <img src={image}/>
        </div>
      </div>


  );
}
if (!window.customElements.get('text-image')) {
  customElements.define(
    'text-image',
    r2wc<TextImage>(TextImage, {
      props: {
        title: 'string',
        subtitle: 'string',
        image: 'string',
        isimageright: 'boolean',
      },
    }),
  );
}
