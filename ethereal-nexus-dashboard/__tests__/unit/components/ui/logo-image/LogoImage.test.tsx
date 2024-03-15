import React from 'react';
import { RenderResult, render, screen } from '@testing-library/react';
import LogoImage from '@/components/ui/logo-image';
import { useTheme } from 'next-themes';

jest.mock('next-themes');

jest.mock('next-auth', () => ({
  signIn: jest.fn(),
}));

describe('LogoImage component', () => {
  let wrapper: RenderResult;

  const renderComponent = () => {
    wrapper = render(<LogoImage/>);
  };

  beforeEach(() => {
    // Mock the return value of useTheme
    useTheme.mockReturnValue({ theme: 'light', setTheme: jest.fn() });

    // Set up mock implementation for window.matchMedia
    window.matchMedia = jest.fn().mockImplementation(query => {
      return {
        matches: false, // Set the initial match status as needed
        media: query,
        onchange: null,
        addListener: jest.fn(), // Mock addListener method
        removeListener: jest.fn(), // Mock removeListener method
        dispatchEvent: jest.fn(), // Mock dispatchEvent method
      };
    });
    renderComponent();
  });

  it('should match snapshot', () => {
    expect(wrapper.baseElement).toMatchSnapshot();
  });

  it('should render the light mode image with light mode theme by default', () => {
    const image = screen.getByTestId('ethereal-logo-light-image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('light'));
  });

  it('should render the dark mode image theme when theme is "dark"', () => {
    // Mock useTheme hook to return 'dark' theme
    useTheme.mockReturnValue({ theme: 'dark', setTheme: jest.fn() });

    renderComponent();
    const image = screen.getByTestId('ethereal-logo-dark-image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('dark'));
  });

  it('should render the prefered mode theme (system) when theme is "system"', () => {
    useTheme.mockReturnValue({ theme: 'system', setTheme: jest.fn() });
    renderComponent();
    const preferredColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    const image = screen.getByTestId(`ethereal-logo-${preferredColorScheme}-image`);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining(preferredColorScheme));
  });
});
