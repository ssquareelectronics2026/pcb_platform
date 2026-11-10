import './globals.css';
import type { Metadata } from 'next';
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import Navbar from '@/components/Navbar';
import AIAssistantWidget from '@/components/AIAssistantWidget';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

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
    <html lang="en" className={`${ibmPlexSans.variable} ${jetBrainsMono.variable}`}>
      <body className="bg-[#f6f5f1] text-[#161513] min-h-screen flex flex-col font-sans antialiased bg-cad-grid selection:bg-[#9a6320]/15 selection:text-[#161513]">
        <Navbar />

        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full">
          {children}
        </main>

        <footer className="border-t border-[#161513]/10 bg-[#f6f5f1] py-8 text-[#52504a] text-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 sm:pr-64 lg:pr-64 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-medium text-[#161513]">
                S SQUARE ELECTRONICS{' '}
                <span className="font-mono text-xs text-[#76736c] ml-1.5">
                  PCB Component Hub
                </span>
              </p>
              <p className="text-xs text-[#76736c]">
                &copy; {new Date().getFullYear()} S SQUARE ELECTRONICS. Engineered for hardware design teams.
              </p>
            </div>
            <div className="text-xs sm:text-sm text-[#52504a]">
              Engineering support:{' '}
              <a
                href="mailto:ssquareelectronics2026@gmail.com?subject=Regarding%20PCB%20Component%20Request"
                className="font-mono text-xs sm:text-[13px] text-[#9a6320] hover:text-[#7a4c14] underline underline-offset-4 transition-colors duration-150 ease-unslop"
              >
                ssquareelectronics2026@gmail.com
              </a>
            </div>
          </div>
        </footer>

        {/* Global Floating AI Hardware Assistant */}
        <AIAssistantWidget />
      </body>
    </html>
  );
}
