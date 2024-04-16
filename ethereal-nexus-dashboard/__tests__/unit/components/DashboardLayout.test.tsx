import React from 'react';
import { render, screen, act } from '@testing-library/react';
import DashboardLayout from '@/components/layout';
import LogoImage from '@/components/ui/logo-image';
import { MainNav } from '@/components/ui/main-nav/main-nav';
import ThemePicker from '@/components/theme-picker';
import { UserNav } from '@/components/user/user-nav';
import { Toaster } from '@/components/ui/toaster';
import { useTheme } from 'next-themes';

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');
jest.mock('next-themes', () => ({
  ...jest.requireActual('next-themes'),
  useTheme: jest.fn().mockImplementation(() => ({
    resolvedTheme: undefined,
    setTheme: jest.fn(),
  })),
}));

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
  it('should render loader if theme is undefined',  () => {
    render(
      <DashboardLayout>
        <div>Child Component</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId('global-loader')).toBeInTheDocument();
    expect(screen.queryByText('Ethereal Nexus Logo')).not.toBeInTheDocument();
    expect(screen.queryByText('Main Nav')).not.toBeInTheDocument();
  });
  it('should render all child components if theme is defined',  () => {
    (useTheme as jest.Mock).mockReturnValue({
      resolvedTheme: 'dark',
      setTheme: jest.fn(),
    });

    render(
      <DashboardLayout>
        <div>Child Component</div>
      </DashboardLayout>
    );

    expect(setTimeout).toHaveBeenCalledTimes(1);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.queryByTestId('global-loader')).not.toBeInTheDocument();
    expect(screen.getByText('Ethereal Nexus Logo')).toBeInTheDocument();
    expect(screen.getByText('Main Nav')).toBeInTheDocument();
    expect(screen.getByText('ThemePicker')).toBeInTheDocument();
    expect(screen.getByText('User Nav')).toBeInTheDocument();
    expect(screen.getByText('Toaster')).toBeInTheDocument();
    expect(screen.getByText('Child Component')).toBeInTheDocument();
  });
});
