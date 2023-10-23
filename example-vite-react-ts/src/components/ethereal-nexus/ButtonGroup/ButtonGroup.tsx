import r2wc from '@r2wc/react-to-web-component';
import Button, { ButtonProps } from '../Button/Button';

export interface ButtonGroupProps {
  buttons: ButtonProps[];
}

export default function ButtonGroup({
  buttons = [
    {
      name: 'default',
      label: 'default',
      url: 'default',
    },
    {
      name: 'button 2',
      label: 'button 2',
      url: 'button 2',
      style: 'primary',
    },
    {
      name: 'button 3',
      label: 'button 3',
      url: 'button 2',
    },
  ],
}: ButtonGroupProps) {
  const renderButtons = (buttons: ButtonProps[]) => {
    return buttons.map((button) => {
      return <Button key={button.name} {...button}></Button>;
    });
  };

  return renderButtons(buttons);
}
if (!window.customElements.get('vite-button-group')) {
  customElements.define(
    'vite-button-group',
    r2wc<ButtonGroupProps>(ButtonGroup, {
      props: {
        buttons: 'array',
      },
    }),
  );
}
