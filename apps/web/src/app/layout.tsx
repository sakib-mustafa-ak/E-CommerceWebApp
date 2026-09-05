import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/Navbar';

export const metadata = {
  title: "Siam's Aqua | Multi-Sector Pharmacy & B2B/B2C Platform",
  description: "Next-generation multi-sector e-commerce platform for pharmacy, paikari retail, wholesale, MPO, and food operations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased flex flex-col selection:bg-sky-500 selection:text-white">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>© 2026 Siam's Aqua E-Commerce Platform. All rights reserved.</p>
              <p className="text-slate-600">8-Sector Unified Architecture • Server-Enforced RBAC • 4-Layer Pricing</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
