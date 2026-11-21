import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { X } from 'lucide-react';
import { AuthProvider } from './context/AuthContext.tsx';
import { MapsProvider } from './components/MapsProvider.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { Layout } from './components/Layout.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { EventsPage } from './pages/EventsPage.tsx';
import { EventDetailPage } from './pages/EventDetailPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { TicketPassPage } from './pages/TicketPassPage.tsx';
import { PassesPage } from './pages/PassesPage.tsx';
import { HostEventPage } from './pages/HostEventPage.tsx';
import { PricingPage } from './pages/PricingPage.tsx';
import { TermsPage } from './pages/TermsPage.tsx';
import { PrivacyPage } from './pages/PrivacyPage.tsx';
import { ErrorPage } from './pages/ErrorPage.tsx';

function ScrollToTopOnRouteChange() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}

function MapsQuotaBanner() {
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handler = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  if (!quotaExceeded) return null;

  return (
    <div
      role="alert"
      className="no-print sticky top-0 z-50 w-full border-b border-[#e2e2e2] bg-[#f3f3f3] text-[#000000]"
    >
      <div className="mx-auto flex max-w-[1200px] items-start justify-between gap-4 px-6 md:px-8 py-3 text-xs leading-relaxed">
        <p>
          This demo preview has reached its daily Google Maps quota limit. To continue using map features without interruption, configure your own Google Maps Platform API key in{' '}
          <a
            href="https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline text-[#000000]"
          >
            Google Cloud Console
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => setQuotaExceeded(false)}
          aria-label="Dismiss Google Maps quota notice"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e2e2e2] bg-[#ffffff] text-[#000000]"
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:slug" element={<EventDetailPage />} />
        <Route path="/checkout/:slug" element={<CheckoutPage />} />
        <Route path="/tickets/:orderId" element={<TicketPassPage />} />
        <Route path="/passes" element={<PassesPage />} />
        <Route path="/host" element={<HostEventPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/404" element={<ErrorPage code="404" />} />
        <Route path="/error/402" element={<ErrorPage code="402" />} />
        <Route path="/error/403" element={<ErrorPage code="403" />} />
        <Route path="/error/500" element={<ErrorPage code="500" />} />
        <Route path="/error/503" element={<ErrorPage code="503" />} />
        <Route path="*" element={<ErrorPage code="404" />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MapsProvider>
          <MotionConfig reducedMotion="user">
            <BrowserRouter>
              <ScrollToTopOnRouteChange />
              <MapsQuotaBanner />
              <Layout>
                <AnimatedRoutes />
              </Layout>
              <AuthModal />
            </BrowserRouter>
          </MotionConfig>
        </MapsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
