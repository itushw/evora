import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock } from 'lucide-react';
import { PageTransition } from '../components/PageTransition.tsx';
import { EventImage } from '../components/EventImage.tsx';
import { VenueLocationMap } from '../components/VenueLocationMap.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { checkIsAdminUser, getMergedEventBySlug } from '../lib/firestoreStore.ts';
import { formatInr } from '../lib/format.ts';
import type { EvoraEvent } from '../types/ticketing.ts';

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, authReady } = useAuth();

  const [event, setEvent] = useState<EvoraEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    let active = true;
    checkIsAdminUser(user).then((result) => {
      if (active) setIsAdmin(result);
    });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setNotFound(false);

    getMergedEventBySlug(slug)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setEvent(data);
        const firstAvailable = data.tiers.find((t) => t.remaining > 0) || data.tiers[0];
        if (firstAvailable) {
          setSelectedTierId(firstAvailable.id);
        }
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading || !authReady) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-24">
          <p className="text-sm text-[#5e5e5e]">Loading event...</p>
        </div>
      </PageTransition>
    );
  }

  if (notFound || !event) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-[780px] px-6 md:px-8 py-24">
          <div className="border border-[#e2e2e2] bg-[#ffffff] p-10 md:p-14 rounded-2xl">
            <p className="font-mono-tabular text-xs text-[#5e5e5e]">404</p>
            <h1 className="mt-3 display-xl text-[#000000]">
              This event could not be found
            </h1>
            <p className="mt-4 text-sm text-[#5e5e5e] leading-relaxed">
              The link may be outdated or the organizer may have removed the listing.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                to="/events"
                className="bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-5 py-3 rounded-full"
              >
                Browse Events
              </Link>
              <Link
                to="/"
                className="bg-[#efefef] active:bg-[#e2e2e2] text-[#000000] text-sm font-medium px-5 py-3 rounded-full"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  const isUnapproved =
    event.approvalStatus === 'pending' || event.approvalStatus === 'rejected';
  const canPreviewUnapproved = Boolean(
    user && (user.uid === event.creatorUid || isAdmin),
  );

  if (isUnapproved && !canPreviewUnapproved) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-[780px] px-6 md:px-8 py-24">
          <div className="border border-[#e2e2e2] bg-[#ffffff] p-10 md:p-14 rounded-2xl">
            <p className="font-mono-tabular text-xs text-[#5e5e5e]">UNAVAILABLE</p>
            <h1 className="mt-3 display-xl text-[#000000]">
              This event is not publicly listed yet
            </h1>
            <p className="mt-4 text-sm text-[#5e5e5e] leading-relaxed">
              This listing is currently under review and has not opened for public registration.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                to="/events"
                className="bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-5 py-3 rounded-full"
              >
                Browse Events
              </Link>
              <Link
                to="/"
                className="bg-[#efefef] active:bg-[#e2e2e2] text-[#000000] text-sm font-medium px-5 py-3 rounded-full"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  const selectedTier = event.tiers.find((t) => t.id === selectedTierId) || event.tiers[0];
  const maxQty = selectedTier ? Math.min(10, selectedTier.remaining) : 1;
  const subtotalPaise = selectedTier ? selectedTier.pricePaise * quantity : 0;

  const handleProceed = () => {
    if (isUnapproved || !selectedTier || selectedTier.remaining < 1) return;
    navigate(
      `/checkout/${event.slug}?tier=${encodeURIComponent(selectedTier.id)}&qty=${quantity}`,
    );
  };

  return (
    <PageTransition>
      {isUnapproved ? (
        <div
          role="status"
          className={`w-full border-b px-6 md:px-8 py-3.5 text-xs ${
            event.approvalStatus === 'rejected'
              ? 'border-[#b42318]/30 bg-[#ffffff] text-[#b42318]'
              : 'border-[#e2e2e2] bg-[#f3f3f3] text-[#000000]'
          }`}
        >
          <div className="mx-auto max-w-[1200px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="font-medium">
              {event.approvalStatus === 'rejected'
                ? 'Rejected by admin. This listing is hidden from the public directory.'
                : 'Draft preview: Pending admin approval. Public bookings will open once approved.'}
            </p>
            {event.reviewNote ? (
              <p className="text-xs opacity-85">Note: {event.reviewNote}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-10 md:py-14">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#5e5e5e]"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>All Events</span>
          </Link>

          <div className="mt-6 max-w-4xl">
            <p className="text-xs text-[#5e5e5e]">
              {event.category} · {event.city} · Hosted by {event.host.organization}
            </p>
            <h1 className="mt-3 display-xxl text-[#000000]">{event.title}</h1>
            <p className="mt-4 text-lg text-[#5e5e5e] leading-relaxed">
              {event.subtitle}
            </p>
          </div>

          <div className="mt-9 pt-6 border-t border-[#e2e2e2] grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div className="flex items-start gap-3">
              <Calendar size={16} aria-hidden="true" className="mt-0.5 text-[#000000] shrink-0" />
              <div>
                <p className="text-xs text-[#5e5e5e]">Date</p>
                <p className="mt-0.5 font-medium text-[#000000]">{event.dateLabel}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={16} aria-hidden="true" className="mt-0.5 text-[#000000] shrink-0" />
              <div>
                <p className="text-xs text-[#5e5e5e]">Time</p>
                <p className="mt-0.5 font-mono-tabular font-medium text-[#000000]">
                  {event.timeLabel} {event.timezone}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={16} aria-hidden="true" className="mt-0.5 text-[#000000] shrink-0" />
              <div>
                <p className="text-xs text-[#5e5e5e]">Venue</p>
                <p className="mt-0.5 font-medium text-[#000000]">{event.venueName}</p>
                <p className="text-xs text-[#5e5e5e]">{event.venueAddress}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-[#f3f3f3]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-14 md:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-7 space-y-8">
              <EventImage
                src={event.coverImage}
                alt={event.title}
                caption={event.coverCaption}
                aspectClass="aspect-[16/10]"
              />

              <section className="glass-light border border-[#e2e2e2] rounded-2xl p-7">
                <h2 className="display-md text-[#000000] pb-4 border-b border-[#e2e2e2]">
                  About this event
                </h2>
                <div className="mt-5 space-y-4 editorial-prose text-[15px]">
                  {event.description.map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </section>

              <section className="glass-light border border-[#e2e2e2] rounded-2xl p-7">
                <h2 className="display-md text-[#000000] pb-4 border-b border-[#e2e2e2]">
                  Schedule
                </h2>
                <div className="mt-2 divide-y divide-[#e2e2e2]">
                  {event.schedule.map((item, idx) => (
                    <div
                      key={idx}
                      className="py-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 text-sm"
                    >
                      <div className="sm:col-span-3 font-mono-tabular text-[#5e5e5e]">
                        {item.time}
                      </div>
                      <div className="sm:col-span-6 font-medium text-[#000000]">
                        {item.title}
                      </div>
                      <div className="sm:col-span-3 sm:text-right text-[#5e5e5e]">
                        {item.speaker}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="glass-light border border-[#e2e2e2] rounded-2xl p-7">
                <h2 className="display-md text-[#000000] pb-4 border-b border-[#e2e2e2]">
                  Location
                </h2>
                <div className="mt-5">
                  <VenueLocationMap
                    venueName={event.venueName}
                    venueAddress={event.venueAddress}
                    city={event.city}
                    latitude={event.latitude}
                    longitude={event.longitude}
                  />
                </div>
              </section>

              <section className="glass-light border border-[#e2e2e2] rounded-2xl p-7">
                <h2 className="display-md text-[#000000] pb-4 border-b border-[#e2e2e2]">
                  Organizer & refunds
                </h2>
                <dl className="mt-3 divide-y divide-[#e2e2e2] text-sm">
                  <div className="py-4 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <dt className="sm:col-span-4 text-[#5e5e5e]">Hosted by</dt>
                    <dd className="sm:col-span-8 text-[#000000]">
                      {event.host.name} · {event.host.organization}
                    </dd>
                  </div>
                  <div className="py-4 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <dt className="sm:col-span-4 text-[#5e5e5e]">Contact</dt>
                    <dd className="sm:col-span-8 font-mono-tabular text-[#000000]">
                      {event.host.contactEmail}
                    </dd>
                  </div>
                  <div className="py-4 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <dt className="sm:col-span-4 text-[#5e5e5e]">Refund policy</dt>
                    <dd className="sm:col-span-8 text-[#5e5e5e] leading-relaxed">
                      {event.refundPolicySummary}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            <aside className="lg:col-span-5 lg:sticky lg:top-24 border border-[#e2e2e2] glass-light p-7 rounded-2xl">
              <div className="pb-4 border-b border-[#e2e2e2]">
                <h2 className="display-md text-[#000000]">Select tickets</h2>
              </div>

              <div className="mt-5 space-y-3" role="radiogroup" aria-label="Ticket tiers">
                {event.tiers.map((tier) => {
                  const isSelected = selectedTier?.id === tier.id;
                  const soldOut = tier.remaining <= 0;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={soldOut}
                      onClick={() => {
                        setSelectedTierId(tier.id);
                        setQuantity((q) => Math.min(q, Math.max(1, tier.remaining)));
                      }}
                      className={`w-full text-left p-5 border rounded-xl ${
                        soldOut
                          ? 'border-[#e2e2e2] bg-[#f3f3f3] opacity-60 cursor-not-allowed'
                          : isSelected
                            ? 'border-[#000000] bg-white/90'
                            : 'border-[#e2e2e2] bg-white/60'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-semibold text-[#000000] text-base">
                          {tier.name}
                        </span>
                        <span className="font-mono-tabular font-semibold text-[#000000] text-base whitespace-nowrap">
                          {formatInr(tier.pricePaise)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[#5e5e5e] leading-relaxed">
                        {tier.description}
                      </p>
                      <p className="mt-3 font-mono-tabular text-xs text-[#5e5e5e]">
                        {soldOut ? 'Sold out' : `${tier.remaining} of ${tier.capacity} left`}
                      </p>
                    </button>
                  );
                })}
              </div>

              {selectedTier && selectedTier.remaining > 0 ? (
                <div className="mt-6 pt-6 border-t border-[#e2e2e2]">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="ticket-qty" className="text-sm font-medium text-[#000000]">
                      Quantity
                    </label>
                    <div className="flex items-center border border-[#e2e2e2] bg-white/90 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        aria-label="Decrease quantity"
                        className="h-10 w-10 text-base font-medium text-[#000000] border-r border-[#e2e2e2]"
                      >
                        -
                      </button>
                      <input
                        id="ticket-qty"
                        type="number"
                        min={1}
                        max={maxQty}
                        value={quantity}
                        onChange={(e) => {
                          const val = Number.parseInt(e.target.value, 10);
                          if (!Number.isNaN(val)) {
                            setQuantity(Math.max(1, Math.min(maxQty, val)));
                          }
                        }}
                        className="h-10 w-14 text-center font-mono-tabular text-sm text-[#000000] bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                        aria-label="Increase quantity"
                        className="h-10 w-10 text-base font-medium text-[#000000] border-l border-[#e2e2e2]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex items-baseline justify-between text-sm">
                    <span className="text-[#5e5e5e]">
                      Subtotal ({quantity} {quantity > 1 ? 'passes' : 'pass'})
                    </span>
                    <span className="font-mono-tabular text-lg font-bold text-[#000000]">
                      {formatInr(subtotalPaise)}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isUnapproved}
                    onClick={handleProceed}
                    className="mt-6 w-full bg-[#000000] active:bg-[#282828] disabled:opacity-45 text-[#ffffff] text-sm font-medium px-5 py-3.5 rounded-xl"
                  >
                    {isUnapproved ? 'Bookings Open After Approval' : 'Continue to Checkout'}
                  </button>
                </div>
              ) : (
                <div className="mt-6 pt-6 border-t border-[#e2e2e2] text-sm text-[#5e5e5e]">
                  This tier is currently sold out.
                </div>
              )}

              <p className="mt-5 text-xs text-[#5e5e5e] leading-relaxed">
                By booking you agree to the Evora{' '}
                <Link to="/terms" className="text-[#000000] underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-[#000000] underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </aside>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
