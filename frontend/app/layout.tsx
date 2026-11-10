import './globals.css';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import AIAssistantWidget from '@/components/AIAssistantWidget';

export const metadata: Metadata = {
  title: 'S SQUARE ELECTRONICS | PCB Component Hub',
  description: 'Download verified KiCAD PCB Footprints & Schematic Symbols by S SQUARE ELECTRONICS',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans antialiased bg-dot-pattern selection:bg-blue-200">
        <Navbar />

        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full relative">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none"></div>
          <div className="absolute top-40 -right-4 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none"></div>
          <div className="relative z-10">
            {children}
          </div>
        </main>

        <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-sm font-medium bg-white/50 backdrop-blur-sm space-y-2">
          <p>
            Questions or custom component requests? Contact us at{' '}
            <a
              href="mailto:ssquareelectronics2026@gmail.com?subject=Regarding%20PCB%20Component%20Request"
              className="text-blue-600 hover:text-blue-700 font-semibold underline transition-colors"
            >
              ssquareelectronics2026@gmail.com
            </a>
          </p>
          <p>&copy; {new Date().getFullYear()} S SQUARE ELECTRONICS — PCB Component Hub. Built for Electronic Engineers.</p>
        </footer>

        {/* Global Floating AI Hardware Assistant */}
        <AIAssistantWidget />
      </body>
    </html>
  );
}
