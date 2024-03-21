import { Toaster } from '@/components/ui/toaster';
import ThemePicker from '@/components/theme-picker';
import { UserNav } from '@/components/user/user-nav';
import { MainNav } from '@/components/ui/main-nav/main-nav';
import LogoImage from '@/components/ui/logo-image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <>
      <div className="flex-col md:flex mt-6">
          <div className="container flex h-16 items-center px-8">
            <LogoImage />
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <ThemePicker />
              <UserNav />
            </div>
          </div>
        <div className="flex-1 space-y-4 p-8 mt-6">
          {children}
        </div>
        <Toaster />
      </div>
    </>
  );
}
