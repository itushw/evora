import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface LayoutProps {
  children: ReactNode;
}

const NAV_LINKS = [
  { label: 'Events', to: '/events' },
  { label: 'Passes', to: '/passes' },
  { label: 'Host Event', to: '/host' },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, authReady, openAuthModal, signOutUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 28);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showSeamlessHeroVeil = isHome && !scrolled && !mobileMenuOpen;

  const isActive = (path: string) => {
    if (path === '/events') {
      return location.pathname === '/events' || location.pathname.startsWith('/events/');
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const userLabel =
    user?.displayName?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Account';

  return (
    <div className="min-h-screen flex flex-col bg-[#ffffff] text-[#000000]">
      <header className="no-print sticky top-0 z-40 w-full text-[#ffffff]">
        {/* Layer A: Seamless opaque-to-clear feathered top veil with masked frosted blur (homepage top only) */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-[156px] transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            showSeamlessHeroVeil ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute inset-0 glass-nav-hero-blur" />
          <div className="absolute inset-0 glass-nav-hero-veil" />
        </div>

        {/* Layer B: Compact 64px dark frosted glass bar (scrolled, inner routes, or mobile menu open) */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 border-b border-white/15 glass-nav-scrolled transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            showSeamlessHeroVeil ? 'opacity-0' : 'opacity-100'
          }`}
        />

        <div className="relative z-10 mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-6 md:px-8 h-16">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="font-display text-2xl font-bold tracking-[-0.03em] text-[#ffffff] whitespace-nowrap shrink-0"
          >
            evora
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-8 text-[15px] font-medium"
          >
            {NAV_LINKS.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap shrink-0 py-1 ${
                    active
                      ? 'text-[#ffffff] border-b border-[#ffffff]'
                      : 'text-[#e2e2e2]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {authReady ? (
              user ? (
                <div className="hidden sm:flex items-center gap-2.5">
                  <Link
                    to="/passes"
                    className="inline-flex items-center justify-center rounded-full border border-white/25 bg-black/35 px-4 py-2 text-xs font-medium text-[#ffffff] whitespace-nowrap"
                  >
                    {userLabel}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void signOutUser();
                    }}
                    className="inline-flex items-center justify-center rounded-full bg-[#ffffff] active:bg-[#e2e2e2] px-4 py-2 text-xs font-medium text-[#000000] whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  className="hidden sm:inline-flex items-center justify-center bg-[#ffffff] active:bg-[#e2e2e2] text-[#000000] text-sm font-medium px-5 py-2 rounded-full whitespace-nowrap shrink-0"
                >
                  Sign In
                </button>
              )
            ) : null}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="md:hidden inline-flex items-center justify-center h-10 w-10 border border-white/25 bg-black/40 text-[#ffffff] rounded-full"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="relative z-10 md:hidden border-t border-white/15 px-6 py-6">
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-base font-medium py-1 ${
                    isActive(item.to) ? 'text-[#ffffff]' : 'text-[#e2e2e2]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {user ? (
                <div className="mt-2 pt-4 border-t border-white/15 flex items-center justify-between gap-3">
                  <span className="text-sm text-[#e2e2e2] truncate">
                    {user.displayName || user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void signOutUser();
                    }}
                    className="inline-flex items-center justify-center bg-[#ffffff] active:bg-[#e2e2e2] text-[#000000] text-sm font-medium px-5 py-2.5 rounded-full shrink-0"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('signin');
                  }}
                  className="mt-2 inline-flex items-center justify-center bg-[#ffffff] active:bg-[#e2e2e2] text-[#000000] text-sm font-medium px-5 py-3 rounded-full"
                >
                  Sign In
                </button>
              )}
            </nav>
          </div>
        ) : null}
      </header>

      <main className="relative z-0 flex-1 w-full bg-[#ffffff]">{children}</main>

      <footer className="no-print w-full bg-[#000000] text-[#ffffff] mt-24">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-14 border-b border-[#282828]">
            <div className="md:col-span-5">
              <Link
                to="/"
                className="font-display text-2xl font-bold tracking-[-0.03em] text-[#ffffff] inline-block"
              >
                evora
              </Link>
              <p className="mt-2 text-sm text-[#afafaf]">
                By Browns&apos; Squad
              </p>
              <p className="mt-5 text-sm text-[#afafaf] max-w-xs leading-relaxed">
                College fests, tech builds, arts showcases, workshops, and live music across India.
              </p>
            </div>

            <div className="md:col-span-3">
              <h2 className="text-sm font-medium text-[#ffffff] mb-4">
                Discover
              </h2>
              <ul className="space-y-3 text-sm text-[#afafaf]">
                <li><Link to="/events">All Events</Link></li>
                <li><Link to="/events?category=Tech">Tech</Link></li>
                <li><Link to="/events?category=Music">Music</Link></li>
                <li><Link to="/events?category=Arts">Arts</Link></li>
                <li><Link to="/events?category=College+Fests">College Fests</Link></li>
                <li><Link to="/events?category=Workshops">Workshops</Link></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h2 className="text-sm font-medium text-[#ffffff] mb-4">
                Organize
              </h2>
              <ul className="space-y-3 text-sm text-[#afafaf]">
                <li><Link to="/host">Host an Event</Link></li>
                <li><Link to="/passes">My Passes</Link></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h2 className="text-sm font-medium text-[#ffffff] mb-4">
                Legal
              </h2>
              <ul className="space-y-3 text-sm text-[#afafaf]">
                <li><Link to="/terms">Terms of Service</Link></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-[#afafaf]">
            <p>© 2026 Evora by Browns&apos; Squad. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/terms" className="text-[#afafaf]">Terms</Link>
              <Link to="/privacy" className="text-[#afafaf]">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
