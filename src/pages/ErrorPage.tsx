import { Link, useSearchParams } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition.tsx';

export type ErrorCodeType = '404' | '402' | '403' | '500' | '503';

interface ErrorPageProps {
  code: ErrorCodeType;
}

const ERROR_SPECS: Record<
  ErrorCodeType,
  {
    statusLabel: string;
    heading: string;
    summary: string;
    guidance: string;
  }
> = {
  '404': {
    statusLabel: 'ERROR 404',
    heading: 'Page not found.',
    summary:
      'The event, pass, or page address you opened does not exist on Evora.',
    guidance:
      'Check the URL or browse active events from the main directory.',
  },
  '402': {
    statusLabel: 'ERROR 402',
    heading: 'Payment could not be completed.',
    summary:
      'Your payment confirmation did not go through and no passes were issued for this attempt.',
    guidance:
      'Return to checkout to try again, or check My Passes if your booking already completed.',
  },
  '403': {
    statusLabel: 'ERROR 403',
    heading: 'Access restricted.',
    summary:
      'You do not have permission to view this resource.',
    guidance:
      'If you are looking for your event ticket, open My Passes and enter your Order ID or email.',
  },
  '500': {
    statusLabel: 'ERROR 500',
    heading: 'Something went wrong.',
    summary:
      'An unexpected server issue interrupted your request.',
    guidance:
      'Wait a moment and reload the page, or return to the events directory.',
  },
  '503': {
    statusLabel: 'ERROR 503',
    heading: 'Temporarily unavailable.',
    summary:
      'Evora is undergoing brief maintenance. Existing entry passes continue working at venue gates.',
    guidance:
      'Please try again in a few minutes.',
  },
};

export function ErrorPage({ code }: ErrorPageProps) {
  const [searchParams] = useSearchParams();
  const spec = ERROR_SPECS[code];
  const customReason = searchParams.get('reason');
  const retryEventSlug = searchParams.get('event');

  return (
    <PageTransition>
      <section className="mx-auto max-w-[820px] px-6 md:px-8 py-20 md:py-28">
        <div className="border border-[#e2e2e2] bg-[#ffffff] p-8 md:p-16 rounded-2xl">
          <div className="flex flex-wrap items-baseline justify-between gap-4 pb-8 border-b border-[#e2e2e2]">
            <p className="font-mono-tabular text-xs font-medium text-[#5e5e5e]">
              {spec.statusLabel}
            </p>
            <span className="font-mono-tabular text-4xl md:text-5xl font-bold text-[#000000]">
              {code}
            </span>
          </div>

          <h1 className="mt-8 display-xl text-[#000000] max-w-2xl">
            {spec.heading}
          </h1>

          <p className="mt-5 text-base text-[#5e5e5e] leading-relaxed max-w-2xl">
            {spec.summary}
          </p>

          {customReason ? (
            <div className="mt-6 border border-[#b42318] bg-[#f3f3f3] p-4 text-sm text-[#b42318] rounded-xl">
              {customReason}
            </div>
          ) : null}

          <p className="mt-4 text-sm text-[#5e5e5e] leading-relaxed max-w-2xl">
            {spec.guidance}
          </p>

          <div className="mt-10 pt-8 border-t border-[#e2e2e2] flex flex-wrap gap-4">
            {code === '402' && retryEventSlug ? (
              <Link
                to={`/checkout/${retryEventSlug}`}
                className="bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-6 py-3 rounded-full"
              >
                Return to Checkout
              </Link>
            ) : (
              <Link
                to="/"
                className="bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-6 py-3 rounded-full"
              >
                Back to Home
              </Link>
            )}
            <Link
              to="/events"
              className="bg-[#efefef] active:bg-[#e2e2e2] text-[#000000] text-sm font-medium px-6 py-3 rounded-full"
            >
              Browse Events
            </Link>
            <Link
              to="/passes"
              className="border border-[#e2e2e2] bg-[#ffffff] text-[#000000] text-sm font-medium px-6 py-3 rounded-full"
            >
              My Passes
            </Link>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
