import React from 'react';
import { RenderResult, render, screen } from '@testing-library/react';
import DashboardLayout from '@/components/layout';
import LogoImage from '@/components/ui/logo-image';
import { MainNav } from '@/components/ui/main-nav/main-nav';
import ThemePicker from '@/components/theme-picker';
import { UserNav } from '@/components/user/user-nav';
import { Toaster } from '@/components/ui/toaster';


jest.mock('next-auth', () => ({
  signIn: jest.fn(),
}));

jest.mock('@/components/ui/logo-image', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/components/ui/main-nav/main-nav', () => ({
  __esModule: true,
  MainNav: jest.fn(),
}));

jest.mock('@/components/theme-picker', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/components/user/user-nav', () => ({
  __esModule: true,
  UserNav: jest.fn(),
}));

jest.mock('@/components/ui/toaster', () => ({
  __esModule: true,
  Toaster: jest.fn(),
}));

// Set up mock implementation for window.matchMedia
window.matchMedia = jest.fn().mockImplementation(query => {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
});


describe('Dashboard layout component', () => {

  beforeEach(() => {
    LogoImage.mockImplementation(() => <div>Ethereal Nexus Logo</div>);
    MainNav.mockImplementation(() => <div>Main Nav</div>);
    ThemePicker.mockImplementation(() => <div>ThemePicker</div>);
    UserNav.mockImplementation(() => <div>User Nav</div>);
    Toaster.mockImplementation(() => <div>Toaster</div>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should match snapshot', () => {
    const { asFragment } = render(
      <DashboardLayout>
        <div>Child Component</div>
      </DashboardLayout>
    );
    expect(asFragment()).toMatchSnapshot();
  });
  it('should render all child components', () => {
    render(
      <DashboardLayout>
        <div>Child Component</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Ethereal Nexus Logo')).toBeInTheDocument();
    expect(screen.getByText('Main Nav')).toBeInTheDocument();
    expect(screen.getByText('ThemePicker')).toBeInTheDocument();
    expect(screen.getByText('User Nav')).toBeInTheDocument();
    expect(screen.getByText('Toaster')).toBeInTheDocument();
  });

  it('should render children within the layout', () => {
    render(<DashboardLayout>Test Content</DashboardLayout>);

    // Test that children are rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
