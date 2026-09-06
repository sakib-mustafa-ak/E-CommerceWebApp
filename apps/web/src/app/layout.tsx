import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/Navbar';

export const metadata = {
  title: "Siam's Aqua | Multi-Sector Pharmacy & Enterprise Logistics",
  description: "B2B & B2C enterprise operations platform for pharmacy, paikari wholesale, MPO field management, and food operations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F8F9FA] text-[#0F172A] min-h-screen antialiased flex flex-col selection:bg-[#EDF5F8] selection:text-[#0F5B78]">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[#E2E8F0] bg-white py-5 text-center text-xs text-[#64748B]">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p>© 2026 Siam's Aqua Logistics &amp; Pharmacy Platform. All rights reserved.</p>
              <p className="text-[#94A3B8] font-mono text-[11px]">
                8-Sector Unified Architecture &bull; Server-Enforced RBAC &bull; 4-Layer Pricing Engine
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
