import './button.css';
import r2wc from '@r2wc/react-to-web-component';

export interface ButtonProps {
  name: string;
  label: string;
  url: string;
  type?: 'submit' | 'button' | 'reset' | undefined;
  style?: string;
}

export default function Button({
  name,
  label,
  url,
  type = 'button',
  style = 'default',
}: ButtonProps) {
  const onClick = () => {
    url && window.open(url, '_blank');
  };

  return (
    <button
      name={name}
      className={`button button-${style}`}
      type={type}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
if (!window.customElements.get('vite-button')) {
  customElements.define(
    'vite-button',
    r2wc<ButtonProps>(Button, {
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
