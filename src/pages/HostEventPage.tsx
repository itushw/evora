import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition.tsx';
import { AuthCard } from '../components/AuthCard.tsx';
import {
  VenueAutocompleteInput,
  type SelectedVenuePlace,
} from '../components/VenueAutocompleteInput.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { AVAILABLE_COVERS } from '../data/seedEvents.ts';
import { createEvent } from '../lib/api.ts';
import { persistHostedEvent } from '../lib/firestoreStore.ts';
import { EVENT_CATEGORIES, type EventCategory } from '../types/ticketing.ts';

interface DraftTier {
  name: string;
  description: string;
  priceRupees: string;
  capacity: string;
}

export function HostEventPage() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Tech');
  const [city, setCity] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [verifiedVenueLabel, setVerifiedVenueLabel] = useState('');

  const [isoDate, setIsoDate] = useState('2026-12-26');
  const [timeLabel, setTimeLabel] = useState('09:30 to 18:30');
  const [timezone, setTimezone] = useState('IST');
  const [coverImage, setCoverImage] = useState(AVAILABLE_COVERS[0].url);
  const [description, setDescription] = useState('');
  const [hostName, setHostName] = useState('');
  const [hostOrganization, setHostOrganization] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [refundPolicySummary, setRefundPolicySummary] = useState(
    'Full refund available up to 48 hours before doors open.',
  );

  const [tiers, setTiers] = useState<DraftTier[]>([
    {
      name: 'General Pass',
      description: 'Standard event admission and campus access.',
      priceRupees: '299',
      capacity: '150',
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!hostName && user.displayName) setHostName(user.displayName);
    if (!hostEmail && user.email) setHostEmail(user.email);
  }, [user, hostName, hostEmail]);

  const handlePlaceSelected = (place: SelectedVenuePlace) => {
    setVenueName(place.venueName);
    setVenueAddress(place.venueAddress);
    if (place.city) setCity(place.city);
    setPlaceId(place.placeId);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setVerifiedVenueLabel(place.venueName);
  };

  const updateTier = (index: number, field: keyof DraftTier, value: string) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        name: 'Team Bundle',
        description: 'Group pass with priority check-in.',
        priceRupees: '999',
        capacity: '40',
      },
    ]);
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErrorBanner('');
    setSubmitting(true);

    try {
      const created = await createEvent({
        title,
        subtitle,
        category,
        city,
        venueName,
        venueAddress,
        placeId,
        latitude,
        longitude,
        dateLabel: isoDate,
        isoDate,
        timeLabel,
        timezone,
        coverImage,
        description,
        hostName,
        hostOrganization,
        hostEmail,
        refundPolicySummary,
        tiers: tiers.map((t) => ({
          name: t.name,
          description: t.description,
          priceRupees: Math.max(0, Number.parseFloat(t.priceRupees) || 0),
          capacity: Math.max(1, Number.parseInt(t.capacity, 10) || 100),
        })),
      });

      await persistHostedEvent(created, user.uid);
      navigate(`/events/${created.slug}`);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to publish event.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <section className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1040px] px-6 md:px-8 py-14 md:py-18">
          <h1 className="display-xxl text-[#000000]">Host an event</h1>
          <p className="mt-3 text-base text-[#5e5e5e] max-w-2xl leading-relaxed">
            Set up your college fest, tech hackathon, arts showcase, workshop, or live show. Once published, attendees can book passes immediately.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-6 md:px-8 py-14 md:py-16">
        {!authReady ? (
          <p className="text-sm text-[#5e5e5e]">Checking your account...</p>
        ) : !user ? (
          <div className="mx-auto max-w-md">
            <AuthCard
              heading="Sign in to host an event"
              subheading="Create an Evora account or sign in to publish listings and manage your campus event."
            />
          </div>
        ) : (
          <>
            {errorBanner ? (
              <div
                role="alert"
                className="mb-8 border border-[#b42318] bg-[#ffffff] p-5 text-sm text-[#b42318] rounded-xl"
              >
                {errorBanner}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-12">
              <div className="border border-[#e2e2e2] bg-[#ffffff] p-7 md:p-10 space-y-6 rounded-2xl">
                <h2 className="text-lg font-bold text-[#000000] pb-4 border-b border-[#e2e2e2]">
                  1. Event details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label htmlFor="host-title" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Event title
                    </label>
                    <input
                      id="host-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="CodeFest 2026: 24-Hour Campus Hackathon"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="host-subtitle" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Short tagline
                    </label>
                    <input
                      id="host-subtitle"
                      type="text"
                      required
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Build across 4 tracks with mentors, meals, and live jury demos."
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="host-category" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Category
                    </label>
                    <select
                      id="host-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as EventCategory)}
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] rounded-lg"
                    >
                      {EVENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="host-city" className="block text-xs font-medium text-[#000000] mb-1.5">
                      City
                    </label>
                    <input
                      id="host-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Bengaluru"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="host-venue" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Venue / Campus (search to pin on map)
                    </label>
                    <VenueAutocompleteInput
                      value={venueName}
                      onChange={(val) => {
                        setVenueName(val);
                        setVerifiedVenueLabel('');
                        setPlaceId(undefined);
                        setLatitude(undefined);
                        setLongitude(undefined);
                      }}
                      onPlaceSelected={handlePlaceSelected}
                      verifiedLabel={verifiedVenueLabel}
                    />
                  </div>

                  <div>
                    <label htmlFor="host-address" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Full address
                    </label>
                    <input
                      id="host-address"
                      type="text"
                      required
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      placeholder="Outer Ring Road, Bengaluru 560103"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="host-date" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Date
                    </label>
                    <input
                      id="host-date"
                      type="date"
                      required
                      value={isoDate}
                      onChange={(e) => setIsoDate(e.target.value)}
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm font-mono-tabular text-[#000000] rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="host-time" className="block text-xs font-medium text-[#000000] mb-1.5">
                        Time
                      </label>
                      <input
                        id="host-time"
                        type="text"
                        required
                        value={timeLabel}
                        onChange={(e) => setTimeLabel(e.target.value)}
                        placeholder="09:30 to 18:30"
                        className="w-full bg-[#efefef] px-3 py-3 text-sm font-mono-tabular text-[#000000] rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="host-tz" className="block text-xs font-medium text-[#000000] mb-1.5">
                        Timezone
                      </label>
                      <input
                        id="host-tz"
                        type="text"
                        required
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        placeholder="IST"
                        className="w-full bg-[#efefef] px-3 py-3 text-sm font-mono-tabular text-[#000000] rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="host-desc" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Description
                    </label>
                    <textarea
                      id="host-desc"
                      rows={4}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Share schedule highlights, what participants should bring, ID rules, and team size limits."
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-[#e2e2e2] bg-[#ffffff] p-7 md:p-10 space-y-6 rounded-2xl">
                <h2 className="text-lg font-bold text-[#000000] pb-4 border-b border-[#e2e2e2]">
                  2. Event cover photo
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {AVAILABLE_COVERS.map((item) => {
                    const selected = coverImage === item.url;
                    return (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => setCoverImage(item.url)}
                        className={`text-left border p-2 rounded-xl ${
                          selected
                            ? 'border-[#000000] bg-[#efefef]'
                            : 'border-[#e2e2e2] bg-[#ffffff]'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.label}
                          referrerPolicy="no-referrer"
                          className="aspect-[16/10] w-full object-cover block rounded-lg"
                        />
                        <span className="mt-2 block text-xs font-medium text-[#000000]">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border border-[#e2e2e2] bg-[#ffffff] p-7 md:p-10 space-y-6 rounded-2xl">
                <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-[#e2e2e2]">
                  <h2 className="text-lg font-bold text-[#000000]">3. Ticket tiers</h2>
                  <button
                    type="button"
                    onClick={addTier}
                    className="bg-[#efefef] active:bg-[#e2e2e2] text-[#000000] text-xs font-medium px-4 py-2 rounded-full"
                  >
                    Add Tier
                  </button>
                </div>

                <div className="space-y-6">
                  {tiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="border border-[#e2e2e2] bg-[#f3f3f3] p-5 space-y-4 rounded-xl"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono-tabular text-xs font-semibold text-[#5e5e5e]">
                          TIER {String(idx + 1).padStart(2, '0')}
                        </span>
                        {tiers.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeTier(idx)}
                            className="text-xs font-medium text-[#b42318]"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#000000] mb-1">
                            Tier name
                          </label>
                          <input
                            type="text"
                            required
                            value={tier.name}
                            onChange={(e) => updateTier(idx, 'name', e.target.value)}
                            className="w-full bg-[#ffffff] border border-[#e2e2e2] px-3 py-2.5 text-sm text-[#000000] rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#000000] mb-1">
                            Price (INR, 0 for Free)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="1"
                            required
                            value={tier.priceRupees}
                            onChange={(e) => updateTier(idx, 'priceRupees', e.target.value)}
                            className="w-full bg-[#ffffff] border border-[#e2e2e2] px-3 py-2.5 text-sm font-mono-tabular text-[#000000] rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#000000] mb-1">
                            Total spots
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={5000}
                            required
                            value={tier.capacity}
                            onChange={(e) => updateTier(idx, 'capacity', e.target.value)}
                            className="w-full bg-[#ffffff] border border-[#e2e2e2] px-3 py-2.5 text-sm font-mono-tabular text-[#000000] rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#000000] mb-1">
                          What is included
                        </label>
                        <input
                          type="text"
                          required
                          value={tier.description}
                          onChange={(e) => updateTier(idx, 'description', e.target.value)}
                          className="w-full bg-[#ffffff] border border-[#e2e2e2] px-3 py-2.5 text-sm text-[#000000] rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#e2e2e2] bg-[#ffffff] p-7 md:p-10 space-y-6 rounded-2xl">
                <h2 className="text-lg font-bold text-[#000000] pb-4 border-b border-[#e2e2e2]">
                  4. Organizer contact
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="org-person" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Your name
                    </label>
                    <input
                      id="org-person"
                      type="text"
                      required
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="Rohan Mehta"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="org-name" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Club / College / Org
                    </label>
                    <input
                      id="org-name"
                      type="text"
                      required
                      value={hostOrganization}
                      onChange={(e) => setHostOrganization(e.target.value)}
                      placeholder="Campus Tech Society"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="org-email" className="block text-xs font-medium text-[#000000] mb-1.5">
                      Contact email
                    </label>
                    <input
                      id="org-email"
                      type="email"
                      required
                      value={hostEmail}
                      onChange={(e) => setHostEmail(e.target.value)}
                      placeholder="fest@college.edu"
                      className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="org-refund" className="block text-xs font-medium text-[#000000] mb-1.5">
                    Refund policy
                  </label>
                  <input
                    id="org-refund"
                    type="text"
                    required
                    value={refundPolicySummary}
                    onChange={(e) => setRefundPolicySummary(e.target.value)}
                    className="w-full bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] rounded-lg"
                  />
                </div>

                <div className="pt-4 border-t border-[#e2e2e2] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="text-xs text-[#5e5e5e]">
                    By publishing you agree to the Evora{' '}
                    <Link to="/terms" className="text-[#000000] underline">
                      Terms of Service
                    </Link>
                    .
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#000000] active:bg-[#282828] disabled:opacity-50 text-[#ffffff] text-sm font-medium px-6 py-3.5 rounded-full whitespace-nowrap"
                  >
                    {submitting ? 'Publishing...' : 'Publish Event'}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </section>
    </PageTransition>
  );
}
