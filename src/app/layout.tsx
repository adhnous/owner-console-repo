// src/app/layout.tsx
import './globals.css';
import NewServiceNotifier from '@/components/new-service-notifier';
import AuthBar from '@/components/auth-bar';
import Sidebar from '@/components/sidebar';
import OwnerGate from '@/components/owner-gate';

export const metadata = { title: 'Owner Console' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <NewServiceNotifier />

        {/* Shell */}
        <div className="min-h-screen flex">
          {/* Sidebar (assumes your <Sidebar/> renders a fixed/relative column) */}
          <Sidebar />

          {/* Main */}
          <main className="flex-1">
            <div className="oc-container" style={{ paddingTop: 24, paddingBottom: 24 }}>
              <div className="space-y-6">
                <AuthBar />
                <OwnerGate>{children}</OwnerGate>
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
