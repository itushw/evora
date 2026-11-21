import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageTransition } from '../components/PageTransition.tsx';
import { QrCodeGraphic } from '../components/QrCodeGraphic.tsx';
import { AuthCard } from '../components/AuthCard.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { ApiError, confirmPayment, createPaymentIntent } from '../lib/api.ts';
import { getMergedEventBySlug, persistConfirmedOrder } from '../lib/firestoreStore.ts';
import { formatInr, saveOrderId } from '../lib/format.ts';
import type { EvoraEvent, PaymentIntentResponse } from '../types/ticketing.ts';

export function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, authReady } = useAuth();

  const [event, setEvent] = useState<EvoraEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [tierId, setTierId] = useState(searchParams.get('tier') || '');
  const [quantity, setQuantity] = useState(() => {
    const raw = Number.parseInt(searchParams.get('qty') || '1', 10);
    return Number.isNaN(raw) ? 1 : Math.max(1, Math.min(10, raw));
  });

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null);
  const [utrReference, setUtrReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!buyerName && user.displayName) setBuyerName(user.displayName);
    if (!buyerEmail && user.email) setBuyerEmail(user.email);
  }, [user, buyerName, buyerEmail]);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let active = true;
    getMergedEventBySlug(slug)
      .then((data) => {
        if (!active) return;
        setEvent(data);
        if (data) {
          const queryTier = searchParams.get('tier');
          const matched = data.tiers.find((t) => t.id === queryTier && t.remaining > 0);
          const fallback = data.tiers.find((t) => t.remaining > 0) || data.tiers[0];
          setTierId((matched || fallback)?.id || '');
        }
      })
      .catch(() => {
        if (active) setEvent(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug, searchParams]);

  if (loading || !authReady) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-[1120px] px-6 md:px-8 py-24">
          <p className="text-sm text-[#5e5e5e]">Loading checkout...</p>
        </div>
      </PageTransition>
    );
  }

  if (!event) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-[760px] px-6 md:px-8 py-24">
          <div className="border border-[#e2e2e2] bg-[#ffffff] p-10 rounded-2xl">
            <p className="font-mono-tabular text-xs text-[#5e5e5e]">404</p>
            <h1 className="mt-3 display-xl text-[#000000]">Event not found</h1>
            <p className="mt-4 text-sm text-[#5e5e5e]">
              Pick an active event from the directory before checking out.
            </p>
            <Link
              to="/events"
              className="mt-6 inline-block bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-5 py-3 rounded-full"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  const selectedTier = event.tiers.find((t) => t.id === tierId) || event.tiers[0];
  const estimatedSubtotal = selectedTier ? selectedTier.pricePaise * quantity : 0;
  const estimatedPlatform = estimatedSubtotal > 0 ? Math.round(estimatedSubtotal * 0.025) : 0;
  const estimatedTotal = estimatedSubtotal + estimatedPlatform;

  const displaySubtotal = intent ? intent.subtotalPaise : estimatedSubtotal;
  const displayPlatform = intent ? intent.platformFeePaise : estimatedPlatform;
  const displayTotal = intent ? intent.totalPaise : estimatedTotal;

  async function handleCreateIntent(e: FormEvent) {
    e.preventDefault();
    if (!user || !event || !selectedTier) return;
    setErrorBanner('');

    if (!acceptedTerms) {
      setErrorBanner('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createPaymentIntent({
        eventSlug: event.slug,
        tierId: selectedTier.id,
        quantity,
        buyerName,
        buyerEmail,
        buyerPhone,
        userId: user.uid,
        eventSnapshot: {
          id: event.id,
          slug: event.slug,
          title: event.title,
          dateLabel: event.dateLabel,
          timeLabel: event.timeLabel,
          venueName: event.venueName,
          venueAddress: event.venueAddress,
          city: event.city,
          tierId: selectedTier.id,
          tierName: selectedTier.name,
          pricePaise: selectedTier.pricePaise,
          capacity: selectedTier.capacity,
          remaining: selectedTier.remaining,
        },
      });
      setIntent(created);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to reserve your tickets.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOrderDone(e: FormEvent) {
    e.preventDefault();
    if (!intent || !user) return;
    setErrorBanner('');
    setSubmitting(true);

    try {
      const order = await confirmPayment({
        intentId: intent.intentId,
        intentToken: intent.intentToken,
        utrReference: utrReference.trim() || undefined,
      });
      await persistConfirmedOrder(order, user.uid);
      saveOrderId(order.orderId);
      navigate(`/tickets/${order.orderId}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 402) {
        navigate(
          `/error/402?reason=${encodeURIComponent(err.message)}&event=${encodeURIComponent(event!.slug)}`,
        );
        return;
      }
      setErrorBanner(err instanceof Error ? err.message : 'Unable to confirm your order.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <div className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1120px] px-6 md:px-8 py-10">
          <Link
            to={`/events/${event.slug}`}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#5e5e5e]"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to {event.title}</span>
          </Link>
          <h1 className="mt-4 display-xl text-[#000000]">Checkout</h1>
        </div>
      </div>

      <div className="w-full bg-[#f3f3f3]">
        <div className="mx-auto max-w-[1120px] px-6 md:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7 space-y-8">
              {!user ? (
                <AuthCard
                  heading="Sign in to complete your booking"
                  subheading="Sign in or create an Evora account so your entry passes and receipts stay linked to your account."
                />
              ) : (
                <>
                  {errorBanner ? (
                    <div
                      role="alert"
                      className="border border-[#b42318] glass-light px-5 py-4 text-sm text-[#b42318] rounded-xl"
                    >
                      {errorBanner}
                    </div>
                  ) : null}

                  <div className="border border-[#e2e2e2] glass-light p-7 md:p-8 rounded-2xl">
                    <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-[#e2e2e2]">
                      <h2 className="text-lg font-bold text-[#000000]">1. Your details</h2>
                      {intent ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIntent(null);
                            setErrorBanner('');
                          }}
                          className="text-xs font-medium text-[#000000] underline"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>

                    {!intent ? (
                      <form onSubmit={handleCreateIntent} className="mt-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="checkout-tier" className="block text-xs font-medium text-[#000000] mb-1.5">
                              Pass type
                            </label>
                            <select
                              id="checkout-tier"
                              value={tierId}
                              onChange={(e) => setTierId(e.target.value)}
                              className="w-full bg-white/85 border border-black/10 px-3.5 py-3 text-sm text-[#000000] rounded-lg"
                            >
                              {event.tiers.map((t) => (
                                <option key={t.id} value={t.id} disabled={t.remaining <= 0}>
                                  {t.name} ({formatInr(t.pricePaise)}) · {t.remaining} left
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor="checkout-qty" className="block text-xs font-medium text-[#000000] mb-1.5">
                              Quantity
                            </label>
                            <select
                              id="checkout-qty"
                              value={quantity}
                              onChange={(e) => setQuantity(Number.parseInt(e.target.value, 10))}
                              className="w-full bg-white/85 border border-black/10 px-3.5 py-3 text-sm text-[#000000] rounded-lg font-mono-tabular"
                            >
                              {Array.from(
                                { length: Math.min(10, Math.max(1, selectedTier?.remaining || 1)) },
                                (_, i) => i + 1,
                              ).map((n) => (
                                <option key={n} value={n}>
                                  {n} {n === 1 ? 'Pass' : 'Passes'}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="buyer-name" className="block text-xs font-medium text-[#000000] mb-1.5">
                            Full name
                          </label>
                          <input
                            id="buyer-name"
                            type="text"
                            required
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            placeholder="Aarav Verma"
                            className="w-full bg-white/85 border border-black/10 px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="buyer-email" className="block text-xs font-medium text-[#000000] mb-1.5">
                              Email address
                            </label>
                            <input
                              id="buyer-email"
                              type="email"
                              required
                              value={buyerEmail}
                              onChange={(e) => setBuyerEmail(e.target.value)}
                              placeholder="you@college.edu"
                              className="w-full bg-white/85 border border-black/10 px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                            />
                          </div>
                          <div>
                            <label htmlFor="buyer-phone" className="block text-xs font-medium text-[#000000] mb-1.5">
                              Phone number (optional)
                            </label>
                            <input
                              id="buyer-phone"
                              type="tel"
                              value={buyerPhone}
                              onChange={(e) => setBuyerPhone(e.target.value)}
                              placeholder="+91 98765 43210"
                              className="w-full bg-white/85 border border-black/10 px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                            />
                          </div>
                        </div>

                        <label className="flex items-start gap-3 pt-2 text-xs text-[#5e5e5e] leading-relaxed cursor-pointer">
                          <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-[#000000]"
                          />
                          <span>
                            I agree to the Evora{' '}
                            <Link to="/terms" className="text-[#000000] underline">
                              Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link to="/privacy" className="text-[#000000] underline">
                              Privacy Policy
                            </Link>
                            .
                          </span>
                        </label>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full bg-[#000000] active:bg-[#282828] disabled:opacity-50 text-[#ffffff] text-sm font-medium px-5 py-3.5 rounded-xl"
                        >
                          {submitting
                            ? 'Preparing order...'
                            : estimatedTotal === 0
                              ? 'Continue to Confirm'
                              : `Continue to Pay ${formatInr(estimatedTotal)}`}
                        </button>
                      </form>
                    ) : (
                      <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <dt className="text-xs text-[#5e5e5e]">Attendee</dt>
                          <dd className="mt-1 font-medium text-[#000000]">{buyerName}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[#5e5e5e]">Email</dt>
                          <dd className="mt-1 font-mono-tabular text-[#000000]">{buyerEmail}</dd>
                        </div>
                      </dl>
                    )}
                  </div>

                  {intent ? (
                    <form
                      onSubmit={handleOrderDone}
                      className="border border-[#e2e2e2] glass-light p-7 md:p-8 space-y-6 rounded-2xl"
                    >
                      <div className="pb-4 border-b border-[#e2e2e2]">
                        <h2 className="text-lg font-bold text-[#000000]">
                          {intent.totalPaise === 0 ? '2. Confirm registration' : '2. Pay via UPI'}
                        </h2>
                        <p className="mt-1 text-xs text-[#5e5e5e]">
                          {intent.totalPaise === 0
                            ? 'No payment needed for this pass. Click below to generate your entry ticket.'
                            : 'Scan the QR code below with any UPI app. The exact amount is already filled in.'}
                        </p>
                      </div>

                      {intent.totalPaise > 0 && intent.paymentQrPayload ? (
                        <div className="space-y-6">
                          <div className="border border-[#e2e2e2] glass-soft p-6 md:p-8 flex flex-col sm:flex-row items-center gap-8 rounded-xl">
                            <QrCodeGraphic
                              value={intent.paymentQrPayload}
                              size={212}
                              label="Dynamic UPI payment QR code for your order total"
                            />
                            <div className="space-y-3 text-center sm:text-left">
                              <p className="text-xs font-medium uppercase tracking-wide text-[#5e5e5e]">
                                Exact Amount Payable
                              </p>
                              <p className="font-mono-tabular text-3xl font-bold text-[#000000]">
                                {formatInr(intent.totalPaise)}
                              </p>
                              <p className="text-xs text-[#5e5e5e] leading-relaxed max-w-xs">
                                Open GPay, PhonePe, Paytm, BHIM, or your bank app and scan this code. Once payment completes on your phone, press Order Done below.
                              </p>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="utr-ref" className="block text-xs font-medium text-[#000000] mb-1.5">
                              UTR / UPI Reference Number (optional)
                            </label>
                            <input
                              id="utr-ref"
                              type="text"
                              value={utrReference}
                              onChange={(e) => setUtrReference(e.target.value)}
                              placeholder="Enter 12-digit UTR if shown in your app"
                              className="w-full bg-white/85 border border-black/10 px-3.5 py-3 text-sm font-mono-tabular text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                            />
                          </div>
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-[#000000] active:bg-[#282828] disabled:opacity-50 text-[#ffffff] text-base font-medium px-6 py-4 rounded-xl"
                      >
                        {submitting
                          ? 'Issuing your pass...'
                          : intent.totalPaise === 0
                            ? 'Confirm Registration'
                            : 'Order Done'}
                      </button>
                    </form>
                  ) : null}
                </>
              )}
            </div>

            <aside className="lg:col-span-5 border border-[#e2e2e2] glass-soft p-7 lg:sticky lg:top-24 rounded-2xl">
              <p className="text-xs font-medium uppercase tracking-wide text-[#5e5e5e]">
                Order Summary
              </p>
              <h2 className="mt-2 text-xl font-bold text-[#000000] leading-snug">
                {event.title}
              </h2>
              <p className="mt-2 text-xs text-[#5e5e5e]">
                {event.dateLabel} · {event.timeLabel}
              </p>
              <p className="mt-1 text-xs text-[#5e5e5e]">
                {event.venueName}, {event.city}
              </p>

              <dl className="mt-6 pt-5 border-t border-[#e2e2e2] space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#5e5e5e]">
                    {selectedTier?.name} x {quantity}
                  </dt>
                  <dd className="font-mono-tabular text-[#000000]">
                    {formatInr(displaySubtotal)}
                  </dd>
                </div>
                {displayPlatform > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#5e5e5e]">Booking fee (2.5%)</dt>
                    <dd className="font-mono-tabular text-[#000000]">
                      {formatInr(displayPlatform)}
                    </dd>
                  </div>
                ) : null}
                <div className="pt-4 border-t border-[#e2e2e2] flex justify-between gap-4 text-base font-bold text-[#000000]">
                  <dt>Total</dt>
                  <dd className="font-mono-tabular">{formatInr(displayTotal)}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
