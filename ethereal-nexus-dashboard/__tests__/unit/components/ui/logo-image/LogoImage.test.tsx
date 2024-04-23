import React from 'react';
import { RenderResult, render, screen } from '@testing-library/react';
import LogoImage from '@/components/ui/logo-image';

describe('LogoImage component', () => {
  let wrapper: RenderResult;

  const renderComponent = () => {
    wrapper = render(<LogoImage/>);
  };

  beforeEach(() => {
    renderComponent();
  });

  it('should match snapshot', () => {
    expect(wrapper.baseElement).toMatchSnapshot();
  });

  it('should render image logo with src and alt attributes', () => {
    const image = screen.getByTestId('ethereal-logo');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('dark'));
    expect(image).toHaveAttribute('alt', 'Ethereal Nexus Logo');
  });
});
