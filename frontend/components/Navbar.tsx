'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', href: '/', exact: true },
    { name: 'Components', href: '/components', exact: false },
    { name: 'Symbol Tutorial', href: '/tutorial/symbol', exact: false },
    { name: 'Footprint Tutorial', href: '/tutorial/footprint', exact: false },
    { name: 'Request Component', href: '/request/component', exact: false },
    { name: 'Request Project Design', href: '/request/project', exact: false },
  ];

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav className="border-b border-[#161513]/10 bg-[#f6f5f1]/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* Brand Text Title (Clean Font, Logo Image Completely Removed) */}
          <Link
            href="/"
            className="flex items-center flex-shrink-0 mr-2 sm:mr-6 focus-visible:outline-none rounded-md"
          >
            <span className="text-[15px] sm:text-base font-semibold tracking-tight text-[#161513] leading-none hover:text-[#9a6320] transition-colors duration-150 ease-unslop whitespace-nowrap">
              S SQUARE ELECTRONICS
            </span>
          </Link>

          {/* Desktop Navigation Tabs with Clean Spacing */}
          <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
            {navItems.map((item) => {
              const active = isLinkActive(item.href, item.exact);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`h-9 px-2.5 xl:px-3 rounded-lg text-[13px] xl:text-sm font-medium inline-flex items-center gap-1.5 transition-colors duration-150 ease-unslop whitespace-nowrap border ${
                    active
                      ? 'bg-white text-[#161513] border-[#161513]/12 shadow-[0_1px_2px_rgba(22,21,19,0.04)]'
                      : 'text-[#52504a] border-transparent hover:text-[#161513] hover:bg-[#161513]/[0.04]'
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full bg-[#9a6320] flex-shrink-0"
                    />
                  )}
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* External Download KiCAD Link */}
            <a
              href="https://www.kicad.org/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 h-9 px-3.5 rounded-lg text-[13px] xl:text-sm font-medium bg-[#161513] hover:bg-[#2a2824] text-white inline-flex items-center gap-1.5 transition-colors duration-150 ease-unslop whitespace-nowrap flex-shrink-0 active:scale-[0.98]"
            >
              <span>Download KiCAD</span>
              <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
            </a>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex lg:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 rounded-lg text-[#161513] hover:bg-[#161513]/[0.06] inline-flex items-center justify-center transition-colors duration-150 ease-unslop"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" strokeWidth={1.5} />
              ) : (
                <Menu className="w-5 h-5" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden border-t border-[#161513]/10 bg-white px-4 py-4 space-y-1 shadow-[0_8px_24px_rgba(22,21,19,0.06)]"
          >
            {navItems.map((item) => {
              const active = isLinkActive(item.href, item.exact);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between h-10 px-3 rounded-lg text-sm font-medium transition-colors duration-150 ease-unslop border ${
                    active
                      ? 'bg-[#eeede8] text-[#161513] border-[#161513]/12'
                      : 'text-[#52504a] border-transparent hover:bg-[#f6f5f1] hover:text-[#161513]'
                  }`}
                >
                  <span>{item.name}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[#9a6320]" />}
                </Link>
              );
            })}

            <div className="pt-2 mt-2 border-t border-[#161513]/10">
              <a
                href="https://www.kicad.org/download/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between w-full h-10 px-3 rounded-lg text-sm font-medium bg-[#161513] hover:bg-[#2a2824] text-white transition-colors duration-150 ease-unslop"
              >
                <span>Download KiCAD</span>
                <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
