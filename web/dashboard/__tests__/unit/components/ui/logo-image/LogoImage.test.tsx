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

  it('should render image logo svg', () => {
    const image = screen.getByTestId('ethereal-logo');
    expect(image).toBeInTheDocument();
  });
});
