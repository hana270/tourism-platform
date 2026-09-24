import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ToastProvider } from '@/components/ui/Toast';
import { DashboardAuthGate } from '@/components/auth/DashboardAuthGate';
import { PageTransition } from '@/components/layout/PageTransition';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <DashboardAuthGate>
        <div className="flex min-h-screen bg-bg">
          <Sidebar />

          <div className="flex min-w-0 flex-1 flex-col">
            <Header />

            <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      </DashboardAuthGate>
    </ToastProvider>
  );
}
