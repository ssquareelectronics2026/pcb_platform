'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', href: '/', exact: true },
    { name: 'Components', href: '/components', exact: false },
    { name: 'Symbol Tutorial', href: '/tutorial/symbol', exact: false },
    { name: 'Footprint Tutorial', href: '/tutorial/footprint', exact: false },
    { name: 'Request Component', href: '/request', exact: false },
  ];

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Brand Logo & Title */}
          <Link href="/" className="flex items-center gap-3.5 group flex-shrink-0">
            <img 
              src="/logo.jpg" 
              alt="S SQUARE ELECTRONICS Logo" 
              className="w-11 h-11 object-contain rounded-xl border border-slate-200/80 shadow-sm group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                S SQUARE ELECTRONICS
              </span>
              <span className="text-xs font-bold text-blue-600 tracking-wide uppercase">
                PCB Component Hub
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Tabs */}
          <div className="hidden lg:flex items-center gap-1.5">
            {navItems.map((item) => {
              const active = isLinkActive(item.href, item.exact);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            {/* External Download KiCAD link */}
            <a
              href="https://www.kicad.org/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 hover:bg-blue-600 text-white shadow-sm transition-all active:scale-95"
            >
              <span>Download KiCAD</span>
              <span className="text-xs">↗</span>
            </a>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex lg:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
          {navItems.map((item) => {
            const active = isLinkActive(item.href, item.exact);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.name}
              </Link>
            );
          })}

          <div className="pt-2">
            <a
              href="https://www.kicad.org/download/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-blue-600 transition-all shadow-md shadow-slate-900/10"
            >
              <span>Download KiCAD</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
